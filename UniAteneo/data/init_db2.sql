CREATE TABLE IF NOT EXISTS CDS (
	id   INTEGER PRIMARY KEY AUTOINCREMENT,
	nome tinytext,
	tipo CHAR(3) -- LT, LM, OR LMC
);

CREATE TABLE IF NOT EXISTS Docente (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	nome     tinytext,
	cognome  tinytext,
	ssd tinytext
);

CREATE TABLE IF NOT EXISTS Insegnamenti (
	id   INTEGER PRIMARY KEY AUTOINCREMENT,
	nome tinytext,
	cfu  tinyINTEGER,
	path_scheda_trasparenza text,
	ssd tinytext, --FOREIGN KEY REFERENCES SSD(code),
	id_docente INTEGER,      --FOREIGN KEY REFERENCES Docente(id)
	FOREIGN KEY (id_docente) REFERENCES Docente(id)
);

CREATE TABLE IF NOT EXISTS Programmi (
	id_corso        INTEGER, --FOREIGN KEY REFERENCES CDS(id),
	id_insegnamento INTEGER, --FOREIGN KEY REFERENCES Insegnamenti(id),
	scelta bool,
	anno   tinyINTEGER,  -- 1,2,3,4 OR 5
	PRIMARY KEY (id_corso, id_insegnamento),
	FOREIGN KEY (id_corso)		  REFERENCES CDS(id),
	FOREIGN KEY (id_insegnamento) REFERENCES Insegnamenti(id)
);

INSERT INTO CDS (nome, tipo) VALUES (
	'Ingegneria Informatica',
	'LT'
	--https://www.unipa.it/dipartimenti/ingegneria/cds/ingegneriainformatica2178/?pagina=insegnamenti
);

-- ************

INSERT INTO Docente (nome, cognome, ssd) VALUES (
	'Adelmo',
	'Balbo-Filogamo',
	'MAT/02'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ALGEBRA',
	'6',
	'MAT/02',
	1
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	1,
	1,
	false,
	1
);
-- ************

INSERT INTO Docente (nome, cognome, ssd) VALUES (
	'Antonina',
	'Faugno',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ARCHITETTURE DEI CALCOLATORI',
	'9',
	'ING-INF/05',
	1
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	1,
	2,
	false,
	2
);

-- ************

INSERT INTO Docente (nome, cognome, ssd) VALUES (
	'Elisa',
	'Tasca-Travaglio',
	'MAT/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ANALISI MATEMATICA C.I.',
	'12',
	'MAT/05',
	1
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	1,
	3,
	false,
	3
);

/*
CREATE TABLE IF NOT EXISTS Studente (
	matricola   INTEGER IDENTITY(6000,15) PRIMARY KEY,
	nome        tinytext,
	cognome     tinytext,
	reddito     INTEGER,
	anno        tinyINTEGER,     -- 1,2,3,4 OR 5
	rate_pagate tinyINTEGER,	 -- 0,1 OR 2
	id_corso    INTEGER FOREIGN KEY REFERENCES CDS(id)
);

CREATE TABLE IF NOT EXISTS PianoDiStudi (
	matricola       INTEGER FOREIGN KEY REFERENCES Studente(matricola),
	id_insegnamento INTEGER FOREIGN KEY REFERENCES Insegnamenti(id),
	voto            tinytext  DEFAULT '0',
	PRIMARY KEY (matricola, id_insegnamento)
);

CREATE TABLE IF NOT EXISTS Esame (
	id              INTEGER IDENTITY(100,15) PRIMARY KEY,
	id_insegnamento INTEGER FOREIGN KEY REFERENCES Insegnamenti(id),
	id_corso        INTEGER FOREIGN KEY REFERENCES CDS(id),
	data            datetime
);

CREATE TABLE IF NOT EXISTS InscrizioniEsami (
	matricola       INTEGER FOREIGN KEY REFERENCES Studente(matricola),
	id_esame        INTEGER FOREIGN KEY REFERENCES Esame(id),
	data_iscrizione datetime,
	PRIMARY KEY (matricola, id_esame)
);