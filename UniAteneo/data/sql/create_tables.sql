CREATE TABLE IF NOT EXISTS SSD (
	code tinytext PRIMARY KEY,
	name tinytext
);

CREATE TABLE IF NOT EXISTS CDS (
	id   INTEGER PRIMARY KEY,
	nome tinytext,
	tipo CHAR(3) -- LT, LM, OR LMC
);

CREATE TABLE IF NOT EXISTS Docenti (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	nome     tinytext,
	cognome  tinytext,
	ssd      tinytext,
	password text,
	UNIQUE (nome, cognome)
);

CREATE TABLE IF NOT EXISTS Insegnamenti (
	id   INTEGER PRIMARY KEY, --AUTOINCREMENT,
	nome tinytext,
	cfu  tinyINTEGER,
	path_scheda_trasparenza text,
	ssd  tinytext,          
	id_docente INTEGER,      
	FOREIGN KEY (id_docente) REFERENCES Docenti(id)
);

CREATE TABLE IF NOT EXISTS Programmi (
	id_corso        INTEGER,
	id_insegnamento INTEGER,
	scelta bool,
	blocco tinyINTEGER,  -- 0,1,2 OR 3
	anno   tinyINTEGER,  -- 1,2,3,4 OR 5
	PRIMARY KEY (id_corso, id_insegnamento, blocco),
	FOREIGN KEY (id_corso)		  REFERENCES CDS(id),
	FOREIGN KEY (id_insegnamento) REFERENCES Insegnamenti(id)
);

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