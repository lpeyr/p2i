import base64
import json
import os.path
import warnings
import io
import urllib
from datetime import datetime, timedelta, timezone

# Package paho-mqtt >> pip install paho-mqtt
import paho.mqtt.client as mqtt

# Inspiration from Projet on https://github.com/RobinMeis/ttn-mqtt-py
# cf. MQTT Server Integration for TTN => https://www.thethingsindustries.com/docs/integrations/mqtt/


class TTNClient:

    def __init__(
        self,
        host,
        application_id,
        application_access_key,
        ttn_data_handler=None,
        ca_cert=None,
    ):
        self.host = host
        self.application_id = application_id
        self.mqtt_application_id = application_id + "@ttn"
        self.application_access_key = application_access_key
        self._ttn_data_handler = ttn_data_handler

        self.devices = []  # Create empty device list

        self.ca_cert = ca_cert
        if ca_cert is not None:  # Check for TLS
            if os.path.exists(ca_cert):
                self.tls = True
                self.port = 8883
            else:  # Fallback if cert not found
                warnings.warn(
                    f"Warning: {ca_cert} could not be found. Fallback to plain", Warning
                )
                self.tls = False
                self.port = 1883
        else:
            self.tls = False
            self.port = 1883

        # Prepare MQTT Client
        # self.mqtt_client = mqtt.Client()
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.mqtt_client.username_pw_set(
            self.mqtt_application_id, password=application_access_key
        )
        if self.tls:  # Setup TLS
            self.mqtt_client.tls_set(ca_certs=self.ca_cert)

        # Register MQTT callbacks
        self.mqtt_client.on_connect = self._mqtt_on_connect
        self.mqtt_client.on_disconnect = self._mqtt_on_disconnect
        self.mqtt_client.on_message = self._mqtt_on_message

    def mqtt_register_device(self, device_id):
        # Add device id to devices list
        self.devices.append(device_id)
        # Subscribe to topic (if connection is established)
        self.mqtt_client.subscribe(
            "v3/%s/devices/%s/up" % (self.mqtt_application_id, device_id)
        )

    def mqtt_register_devices(self, device_ids):
        for device_id in device_ids:
            self.mqtt_register_device(device_id)

    def mqtt_connect(self):  # Connect to TTN
        protocol = "MQTT"
        if self.tls:
            protocol = protocol + "s"
        print(f"Connection: {protocol} @ {self.host}:{self.port}...")
        self.mqtt_client.connect_async(self.host, self.port, 60)
        self.mqtt_client.loop_start()

    def mqtt_disconnect(self):  # Disconnect from TTN
        self.mqtt_client.disconnect()

    def _mqtt_on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code != 0:
            warnings.warn(
                "MQTT Connected with result code " + str(reason_code), Warning
            )

        print("**** MQTT Connected !!!! [" + str(reason_code) + "]")

        # client.subscribe("#")  # General Subscription to all topics

        for device_id in self.devices:  # Subscribe devices to MQTT
            client.subscribe(
                "v3/%s/devices/%s/up" % (self.mqtt_application_id, device_id)
            )

    def _mqtt_on_disconnect(
        self, client, userdata, flags, reason_code, properties=None
    ):
        if reason_code != 0:
            print("MQTT Unexpected disconnection... [" + str(reason_code) + "]")

    def _mqtt_on_message(self, client, userdata, msg):

        try:
            # print("**** MQTT Message !!!! [" + msg.topic + ']')

            topic = msg.topic.split("/")
            ttn_payload = json.loads(msg.payload.decode("UTF-8"))

            # print(ttn_payload)
            # print(json.dumps(ttn_payload, indent=4))

            if topic[-1] == "up" and "uplink_message" in ttn_payload:
                # Handle uplink messages (topic ends with '.../up')
                self._on_ttn_payload(ttn_payload)

            else:
                # Ignore this TTN message
                warnings.warn(
                    "MQTT Warning: Received (currently) unsupported message topic",
                    Warning,
                )

        except Exception as ex:
            print("Exception: " + str(ex))

    def _on_ttn_payload(self, ttn_payload):

        device_id = ttn_payload["end_device_ids"][
            "device_id"
        ]  # ex: 'node16' (cf. topic subscription)
        device_message = ttn_payload["uplink_message"]
        device_payload = {
            "device_id": device_id,
            "date": None,
            "json": None,
            "bytes": None,
            "isodate": None,
        }

        if "received_at" in device_message:
            device_payload["isodate"] = device_message["received_at"]
            try:
                # date = datetime.strptime(device_message['received_at'], '%Y-%m-%dT%H:%M:%S.%f%z')
                date = datetime.fromisoformat(
                    device_message["received_at"][:26] + "+00:00"
                )
                device_payload["date"] = date.astimezone()
            except ValueError as ex:
                # Error reading date format
                device_payload["date"] = None

        if "frm_payload" in device_message:
            encoded_raw_device_payload = device_message[
                "frm_payload"
            ]  # Convert payload to bytes
            device_payload["bytes"] = []
            for byte in base64.b64decode(encoded_raw_device_payload):
                device_payload["bytes"].append(byte)

        if "decoded_payload" in device_message:
            device_payload["json"] = device_message["decoded_payload"]

        if self._ttn_data_handler is not None:
            try:
                self._ttn_data_handler.on_ttn_message(device_payload)
            except Exception as ex:
                print("Exception with on_payload Callback: " + str(ex))

    def storage_retrieve_messages(self, hours=24, minutes=0):

        from_datetime = datetime.now(timezone.utc) - timedelta(
            hours=hours, minutes=minutes
        )
        from_datetime_formatted = from_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")
        # print(from_datetime_formatted)

        message_type = "uplink_message"
        api_url = f"https://{self.host}/api/v3/as/applications/{self.application_id}/packages/storage/{message_type}"
        # print(api_url)

        headers = {
            "Authorization": f"Bearer {self.application_access_key}",
            "Accept": "text/event-stream",
        }

        parameters = "after=" + from_datetime_formatted
        data = None

        try:
            request = urllib.request.Request(
                api_url + "?" + parameters, method="GET", headers=headers, data=data
            )
            with urllib.request.urlopen(request) as response:
                responseText = response.read().decode("utf-8")
                for line in io.StringIO(responseText):
                    if len(line) > 2:
                        ttn_payload = json.loads(line)["result"]
                        # print(ttn_payload)

                        if "uplink_message" in ttn_payload:
                            self._on_ttn_payload(ttn_payload)

        except Exception as ex:
            print("Exception: " + str(ex))

    def webhook_send_downlink(self, webhook_id, device_id, payload):

        if type(payload) is str:
            payload = payload.encode()

        mode = "push"
        mode = "replace"
        api_url = f"https://{self.host}/api/v3/as/applications/{self.application_id}/webhooks/{webhook_id}/devices/{device_id}/down/{mode}"
        # print(api_url)

        headers = {
            "Authorization": f"Bearer {self.application_access_key}",
            "Content-Type": "application/json",
        }

        ttn_frames = [
            {
                "frm_payload": base64.b64encode(payload).decode(),
                "f_port": 15,
                "priority": "NORMAL",
            }
        ]

        # ttn_frames = []

        data = json.dumps({"downlinks": ttn_frames}).encode("utf-8")
        print(data)

        try:
            request = urllib.request.Request(
                api_url, method="POST", headers=headers, data=data
            )
            with urllib.request.urlopen(request) as response:
                responseText = response.read().decode("utf-8")
                print("Request Status: " + str(response.status))

        except Exception as ex:
            print("Exception: " + str(ex))
