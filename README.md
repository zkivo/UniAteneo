# UniAteneo

This is a university project my colleague and i did for the web programming class we took in the last year of the bachelor. The repository is intended as an archive purpose, however you can do whatever you want with the code reason it is released with MIT license.

To run the application use the command:

`node server.js`

Note: please be sure you have Node.js installed and all modules. For the latter you can use `npn install` once Node.js is on your machine.

All the documentation is in Italian since it was the language of the class. In fact, this is the only part i am writing in english for curious visitors, the rest is left as it was. Thank you.


## Come far partire il web server

L'unico comado da inserire nel terminale è 

`node server.js`

Quindi, il sito si raggiunge tramite la porta 1337.

## Come accedere da Amministratore dell'ateneo
L'username e la password dell'admin sono rispettivamente: 
* admin 
* 1234

## Come accedere da Studente o Docente

Una volta creato lo studente o il docente dalla pagina dell'amministratore inserire nell'username e password rispettivamente:

* nome.cognome
* password

Sono stati inseriti come esempio un Docente e uno Studente appartenenti alla triennale di Ingegneria Informatica, di seguito le credenziali per accedere ai rispettivi portali:

~ Docente ~
username: giovanni.pisano
password: Pisano1234

~ Studente ~
username: giulia.pace
password: Pace1234

## Come resettare il database

Se dovesse essere necessario riavviare il database alle condizioni originali
basterebbe utilizzare l'argomento reset come:

`node server.js reset`

Attenzione: questo comando cancellerà tutte le modifiche effettuate sino al momento del reset poiché il software sovrascriverà il file db.sqlite nella cartella ./data. Infatti si consiglia di non eliminare il file ./data/_backup/db.sqlite che contine i dati di ripristino.

## I moduli utilizzati

I moduli sono già installati nella cartella node_modules. Tuttavia potrebbe essere necessario reinstallare i pacchetti e ciò è possibile rimuovendo la cartella node_modules e far partire il comando:

`npm install`


