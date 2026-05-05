function decodeUplink(input) {
  var bytes = input.bytes;
  var i = 0;

  // Lecture d'un uint16_t little-endian (2 octets, non signé, plage 0–65535)
  // Arduino est little-endian : octet de poids faible en premier
  function readUInt16() {
    var val = bytes[i] | (bytes[i + 1] << 8);
    i += 2;
    return val;
  }

  return {
    data: {
      // analogRead() retourne 0–1023 (sur 10 bits)
      // Si tu veux convertir en tension : valeur * (3.3 / 1023.0)
      flexiforce1: readUInt16(),  // octets 0–1
      flexiforce2: readUInt16(),  // octets 2–3
      flexiforce3: readUInt16(),  // octets 4–5
    }
  };
}