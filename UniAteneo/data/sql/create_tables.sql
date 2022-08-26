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
	matricola   INTEGER,
	nome        tinytext,
	cognome     tinytext,
	reddito     INTEGER,
	anno        tinyINTEGER,     -- 1,2,3,4 OR 5
	rate_pagate tinyINTEGER,	 -- 0,1 OR 2
	id_corso    INTEGER,
	PRIMARY KEY (matricola),
	FOREIGN KEY (id_corso) REFERENCES CDS(id)
);

CREATE TABLE IF NOT EXISTS PianoDiStudi (
	matricola       INTEGER,
	id_insegnamento INTEGER,
	voto            tinytext  DEFAULT '0',
	PRIMARY KEY (matricola, id_insegnamento),
	FOREIGN KEY (matricola) 	  REFERENCES Studente(matricola),
	FOREIGN KEY (id_insegnamento) REFERENCES Insegnamenti(id)
);

CREATE TABLE IF NOT EXISTS Esame (
	id              INTEGER,
	id_insegnamento INTEGER,
	id_corso        INTEGER,
	data            datetime,
	PRIMARY KEY (id),
	FOREIGN KEY (id_insegnamento) REFERENCES Insegnamenti(id),
	FOREIGN KEY (id_corso) 		  REFERENCES CDS(id)
);

CREATE TABLE IF NOT EXISTS InscrizioniEsami (
	matricola       INTEGER,
	id_esame        INTEGER,
	data_iscrizione datetime,
	PRIMARY KEY (matricola, id_esame),
	FOREIGN KEY (matricola) REFERENCES Studente(matricola),
	FOREIGN KEY (id_esame)  REFERENCES Esame(id)
);