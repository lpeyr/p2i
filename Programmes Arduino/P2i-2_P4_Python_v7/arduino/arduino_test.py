# Python built-in Packages
import time

# Requirement: package pyserial // Terminal >> pip install pyserial
from arduino_manager import ArduinoManager


# Classe ArduinoDataHandler qui doit avoir une méthode on_arduino_data
class ArduinoDataHandler:

    # Constructeur : attributs et paramètres à adapter aux besoins de votre projet (connexion BD, etc.)
    def __init__(self, parameter1, parameter2):
        self.parameter1 = parameter1
        self.parameter2 = parameter2

    # Méthode appelée lorsque le module Arduino reçoit une ligne de données
    def on_arduino_data(self, input_line):
        print(
            f"[ArduinoDataHandler] Données reçues par le Handler avec les paramètres '{self.parameter1}', '{self.parameter2}'"
        )
        self.my_method()
        print("[ArduinoDataHandler] Message de l'Arduino: " + input_line)

    # Méthode(s) à adapter aux besoins de votre projet (requêtes SQL, etc.)
    def my_method(self):
        print(
            f"[ArduinoDataHandler] Méthode du ArduinoDataHandler... ['{self.parameter1}', '{self.parameter2}']"
        )


print("** Début du script **")

port_arduino = None

while port_arduino is None:
    # Trouver le port du device Arduino
    print("Recherche du Port Arduino...")
    port_arduino = ArduinoManager.trouver_port_arduino()
    # si le device Arduino n'a pas encore été trouvé : attendre 5s, puis reboucler
    if port_arduino is None:
        print("Port Arduino non trouvé, attente de 5s")
        try:
            time.sleep(5)
        except KeyboardInterrupt:
            # en cas d'interruption du script
            print("Arrêt de la recherche du Port Arduino")
            break


if port_arduino is not None:

    arduino_data_handler = ArduinoDataHandler("P2i-2 Test Value", 1742)

    print("Port Arduino trouvé")
    arduino_manager = ArduinoManager(
        port_arduino, arduino_data_handler, baudrate=115200
    )

    print("Ouverture de la communication USB avec l'Arduino")
    arduino_manager.open()

    print(
        "Écrire une ligne pour l'envoyer à l'Arduino ou 'stop' (ou 'Q') pour arrêter la communication"
    )

    while True:
        try:
            console_input_line = input()  # Saisie au clavier
        except KeyboardInterrupt:
            print("Arrêt de l'attente de la saisie au clavier")
            break

        if console_input_line == "stop" or console_input_line == "Q":
            break
        elif len(console_input_line) > 0:
            print("Envoi de la ligne à l'Arduino >>> " + console_input_line)
            arduino_manager.write_line(console_input_line)

    print("Fermeture de la communication USB avec l'Arduino")
    arduino_manager.close()

print("** Fin du script **")
