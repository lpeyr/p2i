import os
import csv
import mysql.connector as mysql
import json


with open('./.config/db_conn.json', mode='r') as file:
    config = json.load(file)

IDSEMELLE = 2


def connect():
    try:
        connection = mysql.connect(
            host=config['host'],
            user=config['user'],
            password=config['password'],
            database=config['database'],
            port=config['port']
        )
        return connection
    except mysql.Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None


def find_idSession():
    try:
        connection = connect()
        if connection is None:
            return None, None

        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT Session.idSession, Session.dateDebut
            FROM Session
            WHERE Session.dateFin IS NULL;
            """
        )
        rows = cursor.fetchall()

        if len(rows) == 0:
            print("Pas de session active")
            connection.close()
            return None, None
        elif len(rows) > 1:
            print("Plusieurs sessions actives détectées")

        idSession = rows[0][0]
        session_start_timestamp = rows[0][1].timestamp()
        connection.close()
        return idSession, session_start_timestamp
    except Exception as e:
        print(f"Erreur : {e}")
        return None, None


def absolute_to_relative_timestamp(session_start_timestamp, date_rel_mes):
    return session_start_timestamp + date_rel_mes//1000


def ajouter_angles(time, idSession, idSemelle, angles):
    connection = None 
    try:
        connection = connect()
        if connection is None:
            return

        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO Angle (time, idSession, idSemelle, yaw, pitch, roll)
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            (time, idSession, idSemelle, angles[0], angles[1], angles[2])
        )
        connection.commit()
        print("Angle ajouté avec succès.")
    except mysql.Error as e:
        print(f"Error inserting angle: {e}")
    finally:
        if connection:
            connection.close()


def ajouter_mesure():
    idSession, session_start_timestamp = find_idSession()
    if idSession is not None:
        with open('./imu.txt', mode='r') as file:
            data = csv.DictReader(file, fieldnames=['timestamp', 'yaw', 'pitch', 'roll'])
            for val in data:
                timestamp = absolute_to_relative_timestamp(session_start_timestamp, int(val['timestamp']))
                angles = (float(val['yaw']), float(val['pitch']), float(val['roll']))
                ajouter_angles(timestamp, idSession, IDSEMELLE, angles)
    else:
        print("Aucune session active")


if __name__ == "__main__":
    ajouter_mesure()