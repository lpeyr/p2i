import json
import serial  # pip install pyserial
from datetime import datetime
import mysql.connector as mysql
from serial.tools import list_ports

class AppliProd:

    def __init__(self):
        self.connexion_bd_commune = None

    def connexion_bd(self):
        print("")
        print("**************************")
        print("** Se Connecter à la BD **")
        print("**************************")
        print("")
        try:
            # print('MySQL / paramstyle: ' + mysql.paramstyle)
            self.connexion_bd_commune = mysql.connect(
                host="fimi-bd-srv1.insa-lyon.fr",
                port=3306,
                user="G221_C",  # remplacer par vos propres username
                password="G221_C",  # remplacer par vos propres password
                database="G221_C_BD1",  # remplacer par la BD commune de votre groupe
            )
            print("=> Connexion établie...")
        except Exception as e:
            print("MySQL [ERROR]")
            print(e)

    def ajouter_mesure(self, data, idSession, idSemelle):

        try:
            cursor = self.connexion_bd_commune.cursor()
            mesureFlexi = buildFlexiMesures(data, idSession, idSemelle)
            mesureAccel = buildAccelMesures(data, idSession, idSemelle)

            cursor.executemany(
                "INSERT INTO MesureFlexi (time,flexi1,flexi2,flexi3,idSession,idSemelle) VALUES (%s,%s,%s,%s,%s)",
                mesureFlexi,
            )
            cursor.execute(
                "INSERT INTO MesureGPS (time,lattitude,longitude,idSession,idSemelle) VALUES (%s,%s,%s,%s,%s)",
                [
                    data["timestamp"],
                    data["gps"]["lat"],
                    data["gps"]["lon"],
                    idSession,
                    idSemelle,
                ],
            )
            cursor.executemany(
                "INSERT INTO MesureIMU (time,accel,idSession,idSemelle) VALUES (%s,%s,%s,%s)",
                mesureAccel,
            )
            self.connexion_bd_commune.commit()
        except Exception as e:
            print("MySQL [INSERTION ERROR]")
            print(e)

    def find_idSessionSemelle(self):
        try:
            cursor = self.connexion_bd_commune.cursor()
            cursor.execute(
                "SELECT idSession, semelle1 FROM Session WHERE dateFin IS NULL;"
            )
            rows = cursor.fetchall()

            if len(rows) == 0:
                print("Pas de session active")
                return None,None
            elif len(rows) > 1:
                print("Plusieurs sessions actives détectées")
            idSession, semelle1 = rows[0]
            return idSession, semelle1
        
        except Exception as e:
            print("MySQL [SELECT ERROR]")
            print(e)
            return None,None

def buildFlexiMesures(data, idSession, idSemelle):
    rows = []
    for i in range(len(data["flexi1"])):
        rows.append(
            (
                data["timestamp"],  # ou timestamp + i si tu veux
                data["accel"][i],
                idSession,
                idSemelle,
            )
        )
    return rows


def buildAccelMesures(data, idSession, idSemelle):
    rows = []
    for i in range(len(data["accel"])):
        rows.append(
            (
                data["timestamp"],  # ou timestamp + i si tu veux
                data["flexi1"][i],
                data["flexi2"][i],
                data["flexi3"][i],
                idSession,
                idSemelle,
            )
        )
    return rows


def decode_sensor_data(raw_line):
    """
    Decode a JSON string containing sensor data from Arduino.

    Expected format:
    {timestamp: 128389, flexi1: [0,1], flexi2: [0,1], flexi3: [0,1], gps: [{lat: 12.3, lon: 45.2}], accel: [12.2, 9.3]}

    Returns:
        dict: Parsed sensor data, or None if parsing fails
    """
    try:
        # Handle JavaScript-style object notation (without quotes around keys)
        # Replace unquoted keys with quoted keys
        formatted_line = raw_line

        # Try to parse as standard JSON first
        data = json.loads(formatted_line)
        return data
    except json.JSONDecodeError as e:
        print(f"Error decoding data: {e}")
        print(f"Raw input: {raw_line}")
        return None


def display_sensor_data(data):
    """Pretty print the decoded sensor data."""
    if data is None:
        return

    print("\n--- Sensor Data ---")
    print(f"Timestamp: {data.get('timestamp', 'N/A')}")

    if "flexi1" in data:
        print(f"Flexi 1: {data['flexi1']}")
    if "flexi2" in data:
        print(f"Flexi 2: {data['flexi2']}")
    if "flexi3" in data:
        print(f"Flexi 3: {data['flexi3']}")

    if "gps" in data:
        print(f"GPS Data: {data['gps']}")

    if "accel" in data:
        print(f"Acceleration: {data['accel']}")

    print("-------------------\n")


def find_arduino_port():
    ports = list_ports.comports()

    for port in ports:
        print(f"Port détecté : {port.device} | {port.description}")

        # Recherche "Arduino", "CH340", "USB Serial", etc.
        desc = port.description.lower()

        if "arduino" in desc:
            return port.device

    return None


arduino_port = find_arduino_port()

if arduino_port is None:
    print("Arduino non trouvé")
    exit()

print(f"Arduino détecté sur {arduino_port}")
# Open COM6
ser = serial.Serial(
    port=arduino_port,
    baudrate=9600,  # Match your device's baud rate
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    timeout=1,  # Read timeout in seconds
)

print(f"Connected to {ser.name}")
instance_prod = AppliProd()
instance_prod.connexion_bd()
idSession ,idSemelle= instance_prod.find_idSessionSemelle()
if idSession:
    try:
        while True:
            if ser.in_waiting > 0:  # Bytes available to read
                line = ser.readline()  # Read until newline
                decoded_line = line.decode("utf-8").strip()
                print("-------------------------------------------------------")
                
                if decoded_line.startswith("{"):
                    # Decode and display sensor data
                    sensor_data = decode_sensor_data(decoded_line)
                    if sensor_data:
                        display_sensor_data(sensor_data)
                        instance_prod.ajouter_mesure(sensor_data,idSession ,idSemelle)
                        print("valeur ajt")
                    else:
                        print(f"pas de données")

    except KeyboardInterrupt:
        print("Stopped")
    finally:
        ser.close()
