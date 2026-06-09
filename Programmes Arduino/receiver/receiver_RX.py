import json
from collections import deque
from datetime import datetime, timedelta

import mysql.connector as mysql
import serial
from serial.tools import list_ports


class AppliProd:

    def __init__(self):
        self.connexion_bd_commune = None
        self.cursor = None
        self.buffer = deque()  # FIFO avec deque
        self.last_flexi_state = {}  # stocke dernier état connu par idSemelle: {id: {'flexi1':0,'flexi3':0}}
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
        """Convertit un timestamp relatif (secondes) en datetime d'émission.
        Utilise le moment présent comme référence : datetime.now() - timestamp.
        Accepte la virgule décimale et les millisecondes. Renvoie datetime sans microsecondes.
        """
        try:
            s = str(timestamp_value).strip()
            s = s.replace(",", ".")
            ts = float(s)
            # si le timestamp semble être en millisecondes, le convertir en secondes
            if ts > 1e12:
                ts = ts / 1000.0
            # interpréter le timestamp comme un offset en secondes depuis le début → maintenant - offset
            dt = datetime.now() - timedelta(seconds=ts)
            return dt.replace(microsecond=0)
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
                        f"{datetime.now()} [BUFFER +1] taille={len(self.buffer)} | id={trame.get('id')}"
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
            self.ajouter_mesure_flexi(trame, idSession)
            self.ajouter_mesure_gps(trame, idSession)
            self.ajouter_mesure_accel(trame, idSession)

    def ajouter_mesure_gps(self, trame, idSession):
        if trame.get("gps") is None:
            print("[BD] Trame sans GPS, insertion ignorée.")
            return
        gps = trame["gps"]
        try:
            self.cursor.execute(
                "INSERT INTO MesureGPS (time, lattitude, longitude, idSession, idSemelle) VALUES (%s, %s, %s, %s, %s)",
                (
                    self.timestamp_to_datetime(0),
                    gps["lat"] * 100 if gps["lat"] != 0 else 45.783865,
                    gps["lon"] * 100 if gps["lon"] != 0 else 4.882950,
                    idSession,
                    trame["id"],
                ),
            )
            self.connexion_bd_commune.commit()
        except Exception as e:
            print(f"MySQL [ERREUR] : {e}")

    def ajouter_mesure_flexi(self, trame, idSession):
        """Insère les mesures flexi et compte les pas à partir des listes de 0/1.
        Comptage : chaque transition 0↔1 sur flexi1 OU flexi3 est un pas. On compte toutes
        les transitions à l'intérieur de la liste, et on compare le premier élément au dernier
        état connu pour compter la transition entre trames.
        """
        if not all(k in trame for k in ("flexi1", "flexi2", "flexi3")):
            print("[BD] Trame sans flexi, insertion ignorée.")
            return
        # base de temps
        try:
            base_dt = self.timestamp_to_datetime(0)
        except ValueError as e:
            print(f"MySQL [ERREUR] : {e}")
            return
        idSemelle = trame.get("id")
        # normaliser les séquences en ints et même longueur
        seq1 = [int(x) if x is not None else 0 for x in trame.get("flexi1", [])]
        seq2 = [int(x) if x is not None else 0 for x in trame.get("flexi2", [])]
        seq3 = [int(x) if x is not None else 0 for x in trame.get("flexi3", [])]
        n = min(len(seq1), len(seq2), len(seq3))

        steps_added = 0
        stored_last = self.last_flexi_state.get(idSemelle)
        stored_last_f1 = stored_last["flexi1"] if stored_last else None
        stored_last_f3 = stored_last["flexi3"] if stored_last else None

        prev1_in_list = None
        prev3_in_list = None

        try:
            for i in range(n):
                f1 = seq1[i]
                f2 = seq2[i]
                f3 = seq3[i]
                new_dt = (base_dt + timedelta(seconds=i * 0.5)).replace(microsecond=0)
                # insérer
                self.cursor.execute(
                    "INSERT INTO MesureFlexi (time, flexi1, flexi2, flexi3, idSession, idSemelle) VALUES (%s, %s, %s, %s, %s, %s)",
                    (new_dt, f1, f2, f3, idSession, idSemelle),
                )
                # compter transitions pour f1
                if prev1_in_list is None:
                    if stored_last_f1 is not None and f1 != stored_last_f1:
                        steps_added += 1
                else:
                    if f1 != prev1_in_list:
                        steps_added += 1
                # compter transitions pour f3
                if prev3_in_list is None:
                    if stored_last_f3 is not None and f3 != stored_last_f3:
                        steps_added += 1
                else:
                    if f3 != prev3_in_list:
                        steps_added += 1
                prev1_in_list = f1
                prev3_in_list = f3
            # valider toutes les insertions des échantillons
            self.connexion_bd_commune.commit()
        except Exception as e:
            # rollback en cas d'erreur d'insertion
            try:
                self.connexion_bd_commune.rollback()
            except Exception:
                pass
            print(f"MySQL [ERREUR] : {e}")

        # sauvegarder dernier état (dernier élément de la liste si présent)
        if idSemelle is not None and prev1_in_list is not None:
            self.last_flexi_state[idSemelle] = {"flexi1": prev1_in_list, "flexi3": prev3_in_list}

        # incrémenter le compteur de pas dans la table Session
        if steps_added > 0:
            try:
                self.cursor.execute(
                    "UPDATE Session SET step = COALESCE(step, 0) + %s WHERE idSession = %s",
                    (steps_added, idSession),
                )
                self.connexion_bd_commune.commit()
            except Exception as e:
                print(f"MySQL [ERREUR] : {e}")

    def ajouter_mesure_accel(self, trame, idSession):
        if "accel" not in trame:
            print("[BD] Trame sans accélération, insertion ignorée.")
            return
        try:
            base_dt = self.timestamp_to_datetime(0)
        except ValueError as e:
            print(f"MySQL [ERREUR] : {e}")
            return
        for i in range(len(trame["accel"])):
            try:
                new_dt = (base_dt + timedelta(seconds=i)).replace(microsecond=0)
                self.cursor.execute(
                    "INSERT INTO MesureAccel (time, accel, idSession, idSemelle) VALUES (%s, %s, %s, %s)",
                    (
                        new_dt,
                        round(trame["accel"][i], 2),
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
