# Деплой на GitHub Pages — runbook

Репозиторий: **`3hcloud-pricing-churn-demo`** · public · base уже прописан в `vite.config.js`.

> Выполняется на твоём Mac (нужны `git`, `node`, и авторизованный `gh`). Если gh не залогинен — сначала `gh auth login`.

## Команды (copy-paste блоком)

```bash
cd "/Users/revvoensvet/Documents/IR/110-test_tasks/2026-06-30-team-inno-3hcloud/prototype"

# 1. Чтобы внешний git-репозиторий IR не цеплял прототип как embedded repo
grep -qxF "110-test_tasks/2026-06-30-team-inno-3hcloud/prototype/" "/Users/revvoensvet/Documents/IR/.gitignore" \
  || echo "110-test_tasks/2026-06-30-team-inno-3hcloud/prototype/" >> "/Users/revvoensvet/Documents/IR/.gitignore"

# 2. Зависимости (если ещё не ставил на Mac)
npm install

# 3. Отдельный git-репозиторий прототипа + первый коммит
git init -b main
git add .
git commit -m "Pricing & Churn Economics Console — synthetic 3HCloud demo"

# 4. Создать public-репо на GitHub и запушить
gh repo create 3hcloud-pricing-churn-demo --public --source=. --remote=origin --push

# 5. Собрать и опубликовать в ветку gh-pages
npm run deploy

# 6. Включить Pages из ветки gh-pages (root)
gh api --method POST repos/{owner}/{repo}/pages \
  -f "source[branch]=gh-pages" -f "source[path]=/" \
  || echo "Если команда не прошла — включи вручную: Settings → Pages → Source: Deploy from a branch → gh-pages /(root)"
```

## Ссылка

После шага 6 (1–2 минуты на сборку Pages):

```
https://<твой-github-username>.github.io/3hcloud-pricing-churn-demo/
```

Проверь: открывается дашборд, в консоли нет ошибок, виден honesty-бейдж, контролы пересчитывают KPI.

## Если позже сменишь имя репозитория

`base` в `vite.config.js` должен совпадать с именем репо. Можно не править файл, а собрать с env:

```bash
GHPAGES_BASE=/новое-имя/ npm run deploy
```

## Обновить уже опубликованный прототип

```bash
git add . && git commit -m "update" && git push
npm run deploy
```
