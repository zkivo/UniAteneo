# UniAteneo

## Come far partire il web server

L'unico comado da inserire nel terminale è 

`node server.js`

### Come resettare il database

Se dovesse essere necessario riavviare il database alle condizioni originali
basterebbe utilizzare l'argomento reset come:

`node server.js reset`

Attenzione: questo comando cancellerà tutte le modifiche effettuate sino al momento del reset poiché il software sovrascriverà il file db.sqlite nella cartella ./data. Infatti si consiglia di non eliminare il file ./data/backup/db.sqlite che contine i dati di ripristino.

## Come accedere da Amministratore dell'ateneo
L'username e la password dell'admin sono rispettivamente: 
* admin 
* 1234

## I moduli utilizzati
I moduli sono già installati nella cartella node_modules. Tuttavia potrebbe essere necessario reinstallare i pacchetti e ciò è possibile attraverso i comandi

`npm uninstall`

`npm install`


