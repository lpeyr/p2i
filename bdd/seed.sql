-- Supprime toutes les données des tables

DELETE FROM MesureAccel;
DELETE FROM MesureAngle;
DELETE FROM MesureFlexi;
DELETE FROM MesureGPS;
DELETE FROM Session;
DELETE FROM Semelle;
DELETE FROM Utilisateur;

-- Réinitialise les auto-increment
ALTER TABLE Utilisateur AUTO_INCREMENT = 1;
ALTER TABLE Semelle AUTO_INCREMENT = 1;
ALTER TABLE Session AUTO_INCREMENT = 1;
ALTER TABLE MesureGPS AUTO_INCREMENT = 1;
ALTER TABLE MesureFlexi AUTO_INCREMENT = 1;
ALTER TABLE MesureAccel AUTO_INCREMENT = 1;
ALTER TABLE MesureAngle AUTO_INCREMENT = 1;

-- Insère un utilisateur de test
INSERT INTO Utilisateur (nom, prenom, role, age, poids, taille)
VALUES ('EL-HAMDEOUI', 'Marouan', 'admin', 20, 100, 185);

-- Insère 2 semelles (droite et gauche)
INSERT INTO Semelle (idUser, devEUI, side)
VALUES 
    (1, '221C221C221C221C', 'right'),
    (1, '221C221C221C221C', 'left');
