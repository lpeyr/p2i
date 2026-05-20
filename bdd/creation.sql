


Drop Table if exists MesureIMU;

Drop Table if exists MesureFlexi;

Drop Table if exists MesureGPS;

Drop Table if exists Session;
Drop Table if exists Semelle;

Drop Table if exists Utilisateur;

Create Table Utilisateur (
idUser INT(10) UNSIGNED auto_increment Primary key,
nom varchar(50) NOT NULL,
prenom varchar(50) NOT NULL,
role varchar(20) NOT NULL,
age INT(10) Unsigned NOT NULL,
poids INT(10) Unsigned Not NULL,
taille INT(10) Unsigned NOT NULL);


Create Table Semelle 
(
idSemelle INT(10) UNSIGNED auto_increment Primary Key,
idUser INT(10) UNSIGNED NOT NULL,
devEUI char(16) NOT NULL,
side enum("left","right") NOT NULL,
Foreign Key (idUser) References Utilisateur(idUser)
);

Create Table Session 
(
idSession INT(10) UNSIGNED auto_increment Primary key,
dateDebut DATETIME Not NULL, 
dateFin DATETIME,
semelle1 INT(10) UNSIGNED NOT NULL,
semelle2 INT(10) UNSIGNED NOT NULL,
step INT(10) UNSIGNED,
averageStepTime float(4,2) UNSIGNED,
Foreign key (semelle1) References Semelle(idSemelle),
Foreign Key (semelle2) References Semelle(idSemelle),
Constraint Check (dateFin is NUll or dateFin>dateDebut)
);

Create Table MesureGPS
(
idMesure INT(10) UNSIGNED auto_increment Primary Key NOT NULL,
time TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
lattitude float,
longitude float,
idSession INT(10) UNSIGNED NOT NULL,
idSemelle INT(10) UNSIGNED NOT NULL,
Foreign Key (idSession) References Session(idSession),
Foreign Key (idSemelle) References Semelle(idSemelle)
);


Create Table MesureFlexi
(
idMesureFlexi INT(10) UNSIGNED auto_increment Primary Key NOT NULL,
time TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
flexi1 bool NOT NULL,
flexi2 bool NOT NULL, 
flexi3 bool NOT NULL,
idSession INT(10) UNSIGNED NOT NULL,
idSemelle INT(10) UNSIGNED NOT NULL,
Foreign key (idSession) References Session(idSession),
Foreign Key (idSemelle) References Semelle(idSemelle)
);

Create Table MesureIMU
(
id INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    accel FLOAT(4,2) Not Null,
    yaw FLOAT(4,2) Not Null,
    pitch FLOAT(4,2) Not Null,
    roll FLOAT(4,2) Not Null,
    idSession INT(10) UNSIGNED NOT NULL,
    idSemelle INT(10) UNSIGNED NOT NULL,
    FOREIGN KEY (idSession) REFERENCES Session(idSession) ,
    FOREIGN KEY (idSemelle) REFERENCES Semelle(idSemelle))
;



