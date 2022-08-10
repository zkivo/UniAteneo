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
	id int IDENTITY(1,1),
	nome    tinytext,
	cognome tinytext,
	code_ssd tinytext FOREIGN KEY REFERENCES SSD(code)
);

CREATE TABLE IF NOT EXISTS Insegnamenti (
	id int IDENTITY(300,15),
	nome tinytext,
	cfu  tinyint,
	path_scheda_trasparenza text,
	code_ssd   tinytext FOREIGN KEY REFERENCES SSD(code),
	id_docente int      FOREIGN KEY REFERENCES Docente(id)
);

CREATE TABLE IF NOT EXISTS Programmi (
	code_corso int FOREIGN KEY REFERENCES CDS(code),
	id_insegnamento int FOREIGN KEY REFERENCES Insegnamenti(id),
	scelta bool,
	anno   tinyint,  -- 1,2,3,4 OR 5
	PRIMARY KEY (code_corso, id_insegnamento)
);