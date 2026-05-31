import json
import mysql.connector as mysql
import serial
from collections import deque
from datetime import datetime, timedelta
from serial.tools import list_ports


class AppliProd:

    def __init__(self):
        self.connexion_bd_commune = None
        self.cursor = None
        self.buffer = deque()  # FIFO avec deque
        with open(".config/db_conn.json", "r") as f:
            self.db_config = json.load(f)

    def connexion_bd(self):
        print("\n**************************")
        print("** Se Connecter à la BD **")
        print("**************************\n")
        try:
            self.connexion_bd_commune = mysql.connect(
                host=self.db_config["host"],
                port=int(self.db_config["port"]),
                user=self.db_config["user"],
                password=self.db_config["password"],
                database=self.db_config["database"],
            )
            print("=> Connexion établie...")
            self.cursor = self.connexion_bd_commune.cursor()
        except Exception as e:
            print(f"MySQL [ERROR] : {e}")

    def find_arduino_port(self):
        ports = list_ports.comports()
        for port in ports:
            if "arduino" in port.description.lower():
                return port.device
        return None

    def find_idSession(self):
        try:
            self.cursor.execute(
                """
                SELECT Session.idSession
                FROM Session
                WHERE Session.dateFin IS NULL;
                """
            )
            rows = self.cursor.fetchall()

            if len(rows) == 0:
                print("Pas de session active")
                return None, None
            elif len(rows) > 1:
                print("Plusieurs sessions actives détectées")
            idSession = rows[0][0]  # On prend la première session active trouvée
            return idSession, None
        except Exception as e:
            print(f"Erreur  : {e}")
            return None, None

    def timestamp_to_datetime(self, timestamp_value):
        """Convertit un timestamp Unix en datetime compatible MariaDB TIMESTAMP."""
        try:
            return datetime.utcfromtimestamp(float(timestamp_value))
        except (TypeError, ValueError, OSError) as e:
            raise ValueError(f"Timestamp invalide: {timestamp_value}") from e

    def lire_serial(self, ser):
        """
        Appelé à chaque itération de la boucle principale.
        Si une ligne est disponible, on la parse et on l'ajoute au buffer FIFO.
        """
        if ser.in_waiting > 0:
            ligne = ser.readline().decode("utf-8", errors="ignore").strip()

            if ligne.startswith("{"):  # c'est une trame JSON
                try:
                    trame = json.loads(ligne)
                    self.buffer.append(trame)
                    print(
                        f"[BUFFER +1] taille={len(self.buffer)} | id={trame.get('id')}"
                    )
                except json.JSONDecodeError:
                    print(f"[JSON ERREUR] ligne ignorée : {ligne}")
            else:
                print(f"[INFO] {ligne}")  # RSSI/SNR ou message de debug

    def vider_buffer(self):
        """
        Dépile les trames du buffer FIFO et les insère en BD.
        À compléter avec ta logique d'insertion.
        """
        idSession, _ = self.find_idSession()
        if idSession is None:
            return
        while self.buffer:
            trame = self.buffer.popleft()  # FIFO : on prend le plus ancien
            self.ajouter_mesure_gps(trame, idSession)  # ta méthode d'insertion

    def ajouter_mesure_gps(self, trame, idSession):
        if trame.get("gps") is None:
            print("[BD] Trame sans GPS, insertion ignorée.")
            return
        gps = trame["gps"]
        try:
            self.cursor.execute(
                "INSERT INTO MesureGPS (time, lattitude, longitude, idSession, idSemelle) VALUES (%s, %s, %s, %s, %s)",
                (
                    self._timestamp_to_datetime(trame["timestamp"]),
                    gps["lat"],
                    gps["lon"],
                    idSession,
                    trame["id"],
                ),
            )
            self.connexion_bd_commune.commit()
        except Exception as e:
            print(f"MySQL [ERREUR] : {e}")

    def ajouter_mesure_flexi(self, trame, idSession):
        for i in range(len(trame["flexi1"])):
            try:
                self.cursor.execute(
                    "INSERT INTO MesureFlexi (time, flexi1, flexi2, flexi3, idSession, idSemelle) VALUES (%s, %s, %s, %s, %s, %s)",
                    (
                        self._timestamp_to_datetime(trame["timestamp"])
                        + timedelta(seconds=i * 0.5),
                        trame["flexi1"][i],
                        trame["flexi2"][i],
                        trame["flexi3"][i],
                        idSession,
                        trame["id"],
                    ),
                )
                self.connexion_bd_commune.commit()
            except Exception as e:
                print(f"MySQL [ERREUR] : {e}")

    def ajouter_mesure_accel(self, trame, idSession):
        for i in range(len(trame["accel"])):
            try:
                self.cursor.execute(
                    "INSERT INTO MesureAccel (time, accel, idSession, idSemelle) VALUES (%s, %s, %s, %s)",
                    (
                        self._timestamp_to_datetime(trame["timestamp"])
                        + timedelta(seconds=i),
                        trame["accel"][i],
                        idSession,
                        trame["id"],
                    ),
                )
                self.connexion_bd_commune.commit()
            except Exception as e:
                print(f"MySQL [ERREUR] : {e}")

    def run(self):
        self.connexion_bd()

        port = self.find_arduino_port()
        if port is None:
            print("[ERREUR] Aucun Arduino détecté")
            return

        with serial.Serial(
            port=port,
            baudrate=9600,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=1,
        ) as ser:
            print(f"Connecté à {ser.name} — en écoute...\n")

            while True:
                # 1. Lire le serial et remplir le buffer
                self.lire_serial(ser)

                # 2. Si le buffer n'est pas vide, insérer en BD
                if self.buffer:
                    self.vider_buffer()


if __name__ == "__main__":
    app = AppliProd()
    app.run()
