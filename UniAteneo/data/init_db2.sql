CREATE TABLE IF NOT EXISTS SSD (
	code tinytext PRIMARY KEY,
	nome tinytext
);

CREATE TABLE IF NOT EXISTS CDS (
	code tinytext PRIMARY KEY,
	nome tinytext,
	tipo char(3), -- LT, LM, OR LMC
	code_ssd tinytext FOREIGN KEY REFERENCES SSD(code)
);

CREATE TABLE IF NOT EXISTS Docente (
	id int IDENTITY(1,1) PRIMARY KEY,
	nome    tinytext,
	cognome tinytext,
	code_ssd tinytext FOREIGN KEY REFERENCES SSD(code)
);

CREATE TABLE IF NOT EXISTS Insegnamenti (
	id int IDENTITY(300,15) PRIMARY KEY,
	nome tinytext,
	cfu  tinyint,
	path_scheda_trasparenza text,
	code_ssd   tinytext FOREIGN KEY REFERENCES SSD(code),
	id_docente int      FOREIGN KEY REFERENCES Docente(id)
);

CREATE TABLE IF NOT EXISTS Programmi (
	code_corso tinytext FOREIGN KEY REFERENCES CDS(code),
	id_insegnamento int FOREIGN KEY REFERENCES Insegnamenti(id),
	scelta bool,
	anno   tinyint,  -- 1,2,3,4 OR 5
	PRIMARY KEY (code_corso, id_insegnamento)
);

CREATE TABLE IF NOT EXISTS Studente (
	matricola int IDENTITY(6000,15) PRIMARY KEY,
	nome    tinytext,
	cognome tinytext,
	reddito int,
	anno    tinyint,  -- 1,2,3,4 OR 5
	rate_pagate tinyint,	 -- 0,1 OR 2
	code_corso  tinytext FOREIGN KEY REFERENCES CDS(code)
);

CREATE TABLE IF NOT EXISTS PianoDiStudi (
	matricola int FOREIGN KEY REFERENCES Studente(matricola),
	id_insegnamento int FOREIGN KEY REFERENCES Insegnamenti(id),
	voto tinytext DEFAULT '0',
	PRIMARY KEY (matricola, id_insegnamento)
);

CREATE TABLE IF NOT EXISTS Esame (
	id int IDENTITY(100,15) PRIMARY KEY,
	id_insegnamento int FOREIGN KEY REFERENCES Insegnamenti(id),
	code_corso tinytext FOREIGN KEY REFERENCES CDS(code),
);