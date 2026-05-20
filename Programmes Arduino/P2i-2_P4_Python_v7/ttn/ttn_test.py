# Requirement: package paho-mqtt // Terminal >> pip install paho-mqtt
import base64
from ttn_client import TTNClient


# Classe TTNDataHandler qui doit avoir une méthode on_ttn_message
class TTNDataHandler:

    # Constructeur : attributs et paramètres à adapter aux besoins de votre projet (connexion BD, etc.)
    def __init__(self, parameter1, parameter2):
        self.parameter1 = parameter1
        self.parameter2 = parameter2

    # Méthode appelée lorsque le client TTN reçoit un message
    def on_ttn_message(self, message):
        #print(f"[TTNDataHandler] Données reçues par le Handler: " + str(message))

        device_id = message['device_id']
        message_date = message['date']
        message_json = message['json']

        aff_message_date = message_date.strftime("%d/%m/%Y %H:%M:%S (%Z%z)")
        print()
        print(f"[TTNDataHandler] {aff_message_date}: Message de {device_id} => " + str(message_json))

        self.my_method(device_id, message_date, message_json)

    # Méthode(s) à adapter aux besoins de votre projet (requêtes SQL, etc.)
    def my_method(self, device_id, message_date, message_json):
        print(f"[TTNDataHandler] Votre Méthode du TTNDataHandler... ['{self.parameter1}', '{self.parameter2}']")



print()
print("*********************")
print("** Début du script **")
print("*********************")
print()


# ** Information de connexion à adapter à votre projet **
ttn_application_id = "projet-224e"
ttn_api_key_secret = "NNSXS.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"


# ** Paramètres du TTN Data Handler à adapter à votre projet **
ttn_data_handler = TTNDataHandler('P2i-2 Test Value', 1234567890)

# ** Choix de la connexion MQTT ou MQTTs **
#ttn_ca_cert = None  # pour connexion MQTT simple
ttn_ca_cert = './mqtt2-ca-cert.pem'  # pour connexion MQTTs avec certificat


# ** Initialisation de la classe TTN Client **
ttn_client = TTNClient(
    "eu1.cloud.thethings.network",
    ttn_application_id,
    ttn_api_key_secret,
    ttn_data_handler,
    ca_cert=ttn_ca_cert
)


# ** Test d'envoi d'un message (downlink) **
# print()
# print("** Envoi d'un message de test")
# payload = 'OK'
# #payload = bytes(bytearray([ 0xAA, 0xBB ]))
# webhook_id = 'cmu-p32'  # ID du Webhook TTN
# target_device_id = 'node7'
# ttn.webhook_send_downlink(webhook_id, target_device_id, payload)
# exit()


# ** Récupération des messages stockés (Message storage) **
print()
print("** Récupération des messages stockés (depuis 5 minutes)")
ttn_client.storage_retrieve_messages(hours=0, minutes=5)  # Penser à activer le "Message storage" sur TTN


# ** Connexion MQTT(s) + Abonnement aux devices **
print()
print("** Connexion MQTT @ TTN")
ttn_client.mqtt_connect()  # Connect to TTN

# ttn.mqtt_register_device("node16")
# ttn.mqtt_register_device("node8")
ttn_client.mqtt_register_devices(['node9', 'node7'])


# ** Script en attente // Réception des Messages MQTT par le Handler **
try:
    print("[Attente au clavier]")
    input("Appuyer 2 fois sur Entrée pour arrêter le script\n\n")
except KeyboardInterrupt as ex:
    print("[Attente interrompue]")


# ** Déconnexion MQTT(s) **
print("Déconnexion de MQTT @ TTN")
ttn_client.mqtt_disconnect()

print("** Fin du script **")
