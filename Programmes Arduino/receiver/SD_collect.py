import os
import csv
import mysql.connector as mysql
import json
import datetime


with open("./.config/db_conn.json", mode="r") as file:
    config = json.load(file)


IDSEMELLE = 2


def connect():
    try:
        connection = mysql.connect(
            host=config["host"],
            user=config["user"],
            password=config["password"],
            database=config["database"],
            port=config["port"],
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
        session_start_timestamp = rows[0][1]
        connection.close()
        return idSession, session_start_timestamp
    except Exception as e:
        print(f"Erreur : {e}")
        return None, None


def absolute_to_relative_timestamp(
    session_start_timestamp: datetime.datetime, delta_ms: int
) -> datetime.datetime:
    return session_start_timestamp + datetime.timedelta(milliseconds=delta_ms)


def ajouter_angles(valeurs: list[tuple]):
    connection = None
    try:
        connection = connect()
        if connection is None:
            return

        cursor = connection.cursor()
        cursor.executemany(
            """
            INSERT INTO MesureAngle (time, idSession, idSemelle, yaw, pitch, roll)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            valeurs,
        )
        connection.commit()
        print(f"{cursor.rowcount} angles ajoutés avec succès.")
    except mysql.Error as e:
        print(f"Error inserting angles: {e}")
    finally:
        if connection:
            connection.close()


def ajouter_mesure(file: str):
    idSession, session_start_timestamp = find_idSession()
    if idSession is not None:
        val_request = []
        with open(file, mode="r") as f:
            data = csv.DictReader(f, delimiter=";")
            for val in data:
                timestamp = absolute_to_relative_timestamp(
                    session_start_timestamp, int(val["timestamp"])
                )
                valeurs = (
                    timestamp,
                    idSession,
                    IDSEMELLE,
                    round(float(val["yaw"]), 2),
                    round(float(val["pitch"]), 2),
                    round(float(val["roll"]), 2),
                )
                val_request.append(valeurs)
        ajouter_angles(val_request)
        print("Mesure ajoutée")
    else:
        print("Aucune session active")


if __name__ == "__main__":
    ajouter_mesure("Programmes Arduino/receiver/imu.txt")