# Python built-in Packages
import threading
# Package pySerial >> pip install pyserial
import serial
import serial.tools.list_ports


class ArduinoManager:

    def __init__(self, port, arduino_data_handler=None, baudrate=115200, timeout=.1):
        self.port = port
        self._serial_connection = None
        self._arduino_data_handler = arduino_data_handler
        self.baudrate = baudrate
        self.timeout = timeout
        self._listening_thread = None

    def open(self):
        self._serial_connection = serial.Serial(port=self.port, baudrate=self.baudrate, timeout=self.timeout)
        self._listening_thread = threading.Thread(target=ArduinoManager._listening_method, args=(self,))
        self._listening_thread.start()

    def close(self):
        print('CLOSING Arduino connection')

        if self._serial_connection is not None:
            self._serial_connection.close()
            self._serial_connection = None

        if self._listening_thread is not None:
            self._listening_thread.join(1000)
            self._listening_thread = None

    def write_line(self, output_line):
        if self._serial_connection is not None:
            self._serial_connection.write(bytes(output_line + '\n', 'utf-8'))

    def _listening_method(self):
        try:
            while True:
                input_line = self._serial_connection.readline().decode("utf-8").strip()
                if input_line:
                    print('ARDUINO >>> ' + input_line)
                    if self._arduino_data_handler is not None:
                        try:
                            self._arduino_data_handler.on_arduino_data(input_line)
                        except Exception as ex:
                            print('Exception with on_input_line Callback: ' + str(ex))

        except serial.SerialException as e:
            print('ARDUINO [ERROR] on listening')
            print(e)

        print('Listening Thread stopping')

    @staticmethod
    def trouver_port_arduino():

        my_arduino_port = None

        ports = list(serial.tools.list_ports.comports())
        print('* List of Serial Ports:')
        for p in ports:
            print(p.device, '[', p.product, '] /', p.description, '@', p.manufacturer)
            if my_arduino_port is None and (not (p.product is None) and 'Arduino' in p.product or not (
                    p.description is None) and 'Arduino' in p.description):
                my_arduino_port = p.device
        print()

        if my_arduino_port is not None:
            print(f'=> Found one Arduino device on port: {my_arduino_port}')
            print()

        return my_arduino_port
