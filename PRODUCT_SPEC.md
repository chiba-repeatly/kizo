# KIZO — Product Specification

## Brand
- Name: KIZO（キゾ）
- Tagline: 記録を、成長に変える。 / BUILD YOUR BEST.
- Visual: premium dark UI (#101715), mint green accents, Japanese-first, mobile-first.
- Audience: beginner to experienced lifters who want training and nutrition in one place.

## V1.0 MVP
1. Dashboard: daily calories and P/F/C in grams, targets, remaining amount, latest workout, navigation.
2. Training: log date, exercise, muscle group, weight (kg), reps, sets; edit/delete; history, PRs, estimated 1RM (clearly estimate); progress chart and calendar.
3. Nutrition: searchable food catalog with verified provenance and food state (raw/cooked); quantity in grams; manual custom food with kcal/P/F/C; meals breakfast/lunch/dinner/snack; edit/delete.
4. PFC: daily totals and macro energy percentages (P/C 4 kcal/g, F 9 kcal/g), adjustable calorie and macro goals, transparent rounding.
5. Meal suggestions: simple rule-based candidate meals using remaining goals, preferences, time and budget. Display approximate nutrition, not medical claims.
6. Workout suggestions: rule-based recommendations based on goal, experience, equipment, recent muscle-group sessions and self-reported fatigue. Avoid high-intensity recommendations when user reports pain or illness.
7. Privacy: browser-only localStorage with export/import JSON and clear-data controls; warn that clearing browser data or changing devices loses records.

## Constraints
- Static HTML/CSS/JavaScript for GitHub Pages; no secrets or paid API keys in client code.
- Do not claim real AI is implemented in V1.0. AI chat is future V2.0 and requires a secure backend.
- Do not claim vitamin/mineral deficiency from incomplete data; show recorded-versus-target differences only.
- Food search must use a legally reusable, attributed and trustworthy data source. If no dataset is ready, ship a clearly labeled limited seed catalog and manual input; never fabricate nutritional accuracy.
- Accessible forms, validation, overnight-safe date handling, mobile UI, empty states, error handling, basic tests.

## Roadmap
V1.0: records, PFC, small food search, dashboard and rules-based suggestions.
V1.5: stronger meal and training planning, weekly summaries, better food database.
V2.0: secure accounts, sync and AI coaching with backend, consent and costs evaluated.

## Acceptance
User can record and later edit/delete a workout and a meal; refresh retains data; daily totals are mathematically correct; suggestions reflect goals and recorded inputs; app works on mobile and can deploy on GitHub Pages.
