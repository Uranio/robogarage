# Comandi GitHub — RoboGarage

Eseguiti da `/home/dupin/robogarage`.

## Stato e remoti

```bash
git status
git remote -v
git remote add origin https://github.com/Uranio/robogarage.git
git remote set-url origin https://github.com/Uranio/robogarage.git
```

## Branch

```bash
git branch -a
git checkout main
git checkout -b feature/nome
git branch -d nome-branch
```

## Sincronizzazione

```bash
git pull origin main
git fetch origin
```

## Modifiche e push

```bash
git add .
git commit -m "feat: descrizione chiara"
git push origin main
git push origin feature/nome
```

## Annullare / correggere

```bash
git restore nome-file
git reset --soft HEAD~1   # annulla ultimo commit, mantiene modifiche
git commit --amend -m "nuovo messaggio"
```
