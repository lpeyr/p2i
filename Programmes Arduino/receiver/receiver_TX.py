import json
import mysql.connector as mysql
import os
import serial
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
from serial.tools import list_ports
from time import sleep


class AppliProd:

    def __init__(self):
        self.connexion_bd_commune = None
        self.cursor = None
        self.angles = {"yaw": [], "pitch": [], "roll": []}
        with open(".config/db_conn.json", "r") as f:
            self.db_config = json.load(f)

    def connexion_bd(self):
        print("")
        print("**************************")
        print("** Se Connecter à la BD **")
        print("**************************")
        print("")
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
            print("MySQL [ERROR]")
            print(e)

    def ajouter_mesure(self, trame, idSession, idSemelle):
        """
        Ajoute une trame contenant 3 dictionnaires à la base de données.
        trame = [dict_flexi, dict_gps, dict_accel]
        """
        try:
            if self.connexion_bd_commune is None:
                self.connexion_bd()
            cursor = self.connexion_bd_commune.cursor()

            dict_flexi, dict_gps, dict_accel = trame

            # Insertion des mesures Flexi
            cursor.executemany(
                "INSERT INTO MesureFlexi (time,flexi1,flexi2,flexi3,idSession,idSemelle) VALUES (%s,%s,%s,%s,%s,%s)",
                [
                    (
                        self._timestamp_to_datetime(dict_flexi.get("timestamp")),
                        dict_flexi.get("flexi1"),
                        dict_flexi.get("flexi2"),
                        dict_flexi.get("flexi3"),
                        idSession,
                        idSemelle,
                    )
                ],
            )

            # Insertion des mesures GPS
            cursor.executemany(
                "INSERT INTO MesureGPS (time,lattitude,longitude,idSession,idSemelle) VALUES (%s,%s,%s,%s,%s)",
                [
                    (
                        self._timestamp_to_datetime(dict_gps.get("timestamp")),
                        dict_gps.get("lat"),
                        dict_gps.get("lon"),
                        idSession,
                        idSemelle,
                    )
                ],
            )

            # Insertion des mesures IMU
            cursor.executemany(
                "INSERT INTO MesureAccel (time,accel,idSession,idSemelle) VALUES (%s,%s,%s,%s)",
                [
                    (
                        self._timestamp_to_datetime(dict_accel.get("timestamp")),
                        json.dumps(dict_accel.get("accel")),
                        idSession,
                        idSemelle,
                    )
                ],
            )

            self.connexion_bd_commune.commit()
            print("✓ Trame insérée avec succès")
        except Exception as e:
            print("MySQL [INSERTION ERROR]")
            print(e)

    def find_idSessionSemelle(self, side):
        try:
            self.cursor.execute(
                """
                SELECT Session.idSession, Semelle.idSemelle
                FROM Session
                JOIN Semelle ON (Semelle.idSemelle = Session.semelle1 OR Semelle.idSemelle = Session.semelle2)
                WHERE Semelle.side = %s
                AND Session.dateFin IS NULL;
                """,
                (side,),
            )
            rows = self.cursor.fetchall()

            if len(rows) == 0:
                print("Pas de session active")
                return None, None
            else:
                print("Plusieurs sessions actives détectées")
            idSession, idSemelle = rows[
                0
            ]  # On prend la première session active trouvée (si plusieurs, c'est un problème de gestion des sessions)
            return idSession, idSemelle

        except Exception as e:
            print(f"Erreur  : {e}")
            return None, None

    def recuperer_fichier_txt_serial(self, port=None, baudrate=9600, timeout=5):

        try:

            # Crée la connexion Serial
            ser = serial.Serial(
                port=self.find_arduino_port() if port is None else port,
                baudrate=baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=timeout,
            )

            print(f"Connecté à {ser.name}")

            # Récupère les données
            fichier_txt = ""
            start_time = datetime.now()

            while (datetime.now() - start_time).total_seconds() < timeout:
                if ser.in_waiting > 0:
                    line = ser.readline().decode("utf-8", errors="ignore")
                    fichier_txt += line

            ser.close()
            print("Port série fermé")

            return fichier_txt if fichier_txt else None

        except Exception as e:
            print(f"Erreur lors de la lecture du port série: {e}")
            return None

    def find_arduino_port(self):
        """Trouve le port Arduino automatiquement."""
        ports = list_ports.comports()
        for port in ports:
            if "arduino" in port.description.lower():
                return port.device
        return None

    def timestamp_to_datetime(self, timestamp_value):
        """Convertit un timestamp Unix en datetime compatible MariaDB TIMESTAMP."""
        try:
            return datetime.utcfromtimestamp(float(timestamp_value))
        except (TypeError, ValueError, OSError) as e:
            raise ValueError(f"Timestamp invalide: {timestamp_value}") from e

    def add_angle_to_db(self, data, idSession, idSemelle):
        try:
            if self.connexion_bd_commune is None:
                self.connexion_bd()
            cursor = self.connexion_bd_commune.cursor()
            for i in range(len(data.get("yaw"))):
                cursor.execute(
                    "INSERT INTO MesureAngle (time,yaw,pitch,roll,idSession,idSemelle) VALUES (%s,%s,%s,%s,%s,%s)",
                    (
                        self._timestamp_to_datetime(data.get("timestamp"))
                        + timedelta(seconds=i * 0.1),
                        data.get("yaw")[i],
                        data.get("pitch")[i],
                        data.get("roll")[i],
                        idSession,
                        idSemelle,
                    ),
                )
            self.connexion_bd_commune.commit()
            print("✓ Mesure insérée avec succès")
        except Exception as e:
            print("MySQL [INSERTION ERROR]")
            print(e)


appli = AppliProd()
print("Recherche de l'Arduino...")
while appli.find_arduino_port():
    print("En attente de données sur le port série...")
    fichier_txt = appli.recuperer_fichier_txt_serial(timeout=10)
    if fichier_txt:
        print("Données reçues")
        appli.save_text_to_file(fichier_txt)
        data = json.loads(fichier_txt)
        idSession, idSemelle = appli.find_idSessionSemelle(data["side"])
        appli.add_angle_to_db(data, idSession, idSemelle)
        print("Données sauvegardées dans la base de données")
    else:
        print("Aucune donnée reçue dans le délai imparti.")
