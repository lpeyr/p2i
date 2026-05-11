function decodeUplink(input) {
  var bytes = input.bytes;
  var NB = 20;  // doit correspondre à #define nb_mesures

  // Lit le bit à la position pos dans le tableau d'octets
  function getBit(pos) {
    return (bytes[Math.floor(pos / 8)] >> (pos % 8)) & 1;
  }

  var f1 = [], f2 = [], f3 = [];
  for (var i = 0; i < NB; i++) {
    f1.push(getBit(i));       // positions 0–19  → flexi1
    f2.push(getBit(i + 20));  // positions 20–39 → flexi2
    f3.push(getBit(i + 40));  // positions 40–59 → flexi3
  }

  return {
    data: {
      flexiforce1: f1,  // tableau de 20 valeurs 0/1
      flexiforce2: f2,
      flexiforce3: f3
    }
  };
}