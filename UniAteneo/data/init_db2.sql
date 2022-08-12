CREATE TABLE IF NOT EXISTS CDS (
	id   INTEGER PRIMARY KEY AUTOINCREMENT,
	nome tinytext,
	tipo CHAR(3) -- LT, LM, OR LMC
);

CREATE TABLE IF NOT EXISTS Docenti (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	nome     tinytext,
	cognome  tinytext,
	ssd      tinytext
);

CREATE TABLE IF NOT EXISTS Insegnamenti (
	id   INTEGER PRIMARY KEY AUTOINCREMENT,
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
	anno   tinyINTEGER,  -- 1,2,3,4 OR 5
	PRIMARY KEY (id_corso, id_insegnamento),
	FOREIGN KEY (id_corso)		  REFERENCES CDS(id),
	FOREIGN KEY (id_insegnamento) REFERENCES Insegnamenti(id)
);

INSERT INTO CDS (id, nome, tipo) VALUES (
	2178,
	'Ingegneria Informatica',
	'LT'
	--https://www.unipa.it/dipartimenti/ingegneria/cds/ingegneriainformatica2178/?pagina=insegnamenti
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Adelmo',
	'Balbo-Filogamo',
	'MAT/02'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ALGEBRA',
	6,
	'MAT/02',
	1
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	1,
	false,
	1
);
-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Antonina',
	'Faugno',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ARCHITETTURE DEI CALCOLATORI',
	9,
	'ING-INF/05',
	2
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	2,
	false,
	1
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Elisa',
	'Tasca-Travaglio',
	'MAT/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ANALISI MATEMATICA C.I.',
	12,
	'MAT/05',
	3
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	3,
	false,
	1
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Annibale',
	'Iacovelli',
	'FIS/03'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'FISICA I',
	9,
	'FIS/03',
	4
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	4,
	false,
	1
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Bianca',
	'Duodo',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'FONDAMENTI DI PROGRAMMAZIONE',
	9,
	'ING-INF/05',
	5
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	5,
	false,
	1
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Eraldo',
	'Bresciani',
	'MAT/03'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'GEOMETRIA',
	6,
	'MAT/03',
	6
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	6,
	false,
	1
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Manuel',
	'Piccinni',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ALGORITMI E STRUTTURE DATI',
	9,
	'ING-INF/05',
	7
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	7,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Tonia',
	'Boitani',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'BASI DI DATI E SISTEMI INFORMATIVI',
	6,
	'ING-INF/05',
	8
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	8,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Raimondo',
	'Acerbi',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'PROGRAMMAZIONE',
	9,
	'ING-INF/05',
	9
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	9,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Vincenzo',
	'Schiavo',
	'ING-IND/31'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'ELETTROTECNICA',
	6,
	'ING-IND/31',
	10
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	10,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Mariana',
	'Vasari',
	'FIS/01'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'FISICA II',
	6,
	'FIS/01',
	11
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	11,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Monica',
	'Bergoglio',
	'MAT/08'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'METODI MATEMATICI E NUMERICI',
	9,
	'MAT/08',
	12
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	12,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Carlo',
	'Ludovisi',
	'ING-INF/03'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'TEORIA DEI SEGNALI',
	9,
	'ING-INF/03',
	13
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	13,
	false,
	2
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Diana',
	'Rossi',
	'ING-INF/04'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'CONTROLLI AUTOMATICI',
	9,
	'ING-INF/04',
	14
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	14,
	false,
	3
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Giacomo',
	'Florio',
	'ING-INF/01'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'FONDAMENTI DI ELETTRONICA',
	9,
	'ING-INF/01',
	15
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	15,
	false,
	3
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Graziella',
	'Taliani',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'INGEGNERIA DEL SOFTWARE',
	9,
	'ING-INF/05',
	16
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	16,
	false,
	3
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Aria',
	'Alfieri',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'PROGRAMMAZIONE WEB E MOBILE',
	9,
	'ING-INF/05',
	17
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	17,
	false,
	3
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Orazio',
	'Morpugno',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'RETI DI CALCOLATORI E INTERNET',
	9,
	'ING-INF/05',
	18
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	18,
	false,
	3
);

-- ************

INSERT INTO Docenti (nome, cognome, ssd) VALUES (
	'Costantino',
	'Leonardi',
	'ING-INF/05'
);

INSERT INTO Insegnamenti (nome, cfu, ssd, id_docente) VALUES (
	'SISTEMI OPERATIVI',
	9,
	'ING-INF/05',
	19
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	19,
	false,
	3
);

-- ************

INSERT INTO Insegnamenti (nome, cfu) VALUES (
	'Prova finale',
	3
);

INSERT INTO Programmi (id_corso, id_insegnamento, scelta, anno) VALUES (
	2178,
	20,
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