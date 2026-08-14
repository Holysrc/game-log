// Dictionary + language state. Every user-facing string lives here (§3).
var LKEY = "gamelog-lang";

export var TR: Record<string, Record<string, string>> = {
ru:{
  st_backlog:"Беклог",st_playing:"Играю",st_done:"Пройдено",st_dropped:"Брошено",st_onhold:"Отложено",
  title:"Журнал игр",subtitle:"беклог · прогресс · история прохождений",
  stat_playing:"играю",stat_backlog:"беклог",stat_done:"пройдено",
  tab_all_aria:"Все игры — домашний экран",tab_catalog:"Библиотека",tab_fav:"⚑ Избранное",fav_on:"⚑ В избранное",fav_off:"⚑ Убрать из избранного",search_ph:"Поиск по играм…",add_btn:"+ Добавить",prompt_name:"Название игры:",
  dice_bar:"🎲 Во что поиграть? Пусть решит судьба",dice_aria:"Случайная игра из беклога",
  dice_none:"Беклог пуст — вот это достижение!",dice_pick:"Судьба выбрала: ",
  long_ago:"Давно",ago_short:"давно",done_old:"Пройдено давно",replayed:"+ Перепройдено",
  add_year:"+ Прошёл в…",remove_from:"Убрать из «{y}»",del:"Удалить",times:" раз",
  confirm_del:"Удалить «{n}» полностью, со всей историей?",
  no_runs_left:"Прохождений не осталось — игра вернулась в беклог",
  added_to:"добавлена в ",platform:"Платформа",launcher:"Лончер",name_ph:"Название игры",rel_ph:"Год выхода",genres_ph:"Жанры",series_ph:"Серия",
  sort_default:"⇅ Без сортировки",sort_name:"По алфавиту",sort_cs:"По оценке сообщества",
  sort_rating:"По моей оценке",sort_rel:"По году выхода",sort_time:"По наигранному",
  merge_with:"⇆ Объединить с «{n}»",merge_keep:"Оставить какую:",cancel:"Отмена",nomerge_done:"Понял, эта пара — не дубли. Вернуть можно в настройках",reset_nomerge:"Вернуть скрытые пары дублей",ser_done:" пройдено",nomerge_reset:"Скрытые пары снова будут предлагаться",merged:"Объединено: ",note_ph:"Заметка по игре — мысли, где остановился, что не забыть…",
  h:" ч",min:" мин",cs_title:"Оценка сообщества Playnite",
  empty:"Пока пусто.",empty_search:"Ничего не найдено. Нажми «+ Добавить», чтобы внести эту игру.",
  added_backlog:"Добавлено в беклог: ",already:"уже в списке",
  sync:"синк",syncing:"синхронизация…",offline:"офлайн · сохранено локально",offline_local:"офлайн · локально",
  storage_warn:"Хранилище недоступно — в этом окне данные не сохранятся",
  gist_created:"Gist создан. Скопируй его ID на другие устройства",
  connected:"Подключено — синхронизирую",connected_drive:"Подключено к Google Drive",
  need_token:"Вставь Apps Script URL или токен GitHub",bad_url:"URL должен начинаться с https://script.google.com/ и кончаться на /exec",
  sync_off:"Синхронизация отключена, данные остались локально",
  gist_fail:"Не вышло создать gist: ",
  imp_none:"В файле не нашлось строк с играми",imp_nocol:"Не нашёл колонку с названием (Name) — проверь экспорт",
  imp_done:"Импорт: добавлено ",imp_upd:", обновлено ",imp_fail:"Не удалось разобрать CSV: ",
  bak_done:"Файл скачан — положи его в надёжное место",restored:"Восстановлено из ",games_w:" игр",
  not_backup:"Это не файл журнала: ",
  ph_gs:"Google Apps Script URL (…/exec)",or_gist:"— или через GitHub Gist —",
  ph_token:"GitHub token (права: только gist)",ph_gist:"Gist ID (оставь пустым — создам новый)",
  connect:"Подключить",disconnect:"Отключить",csv:"Импорт CSV",backup:"Бэкап",restore:"Восстановить",
  set_title:"Настройки",lbl_lang:"Язык",lbl_theme:"Тема",sync_spoiler:"Синхронизация",
  sync_help_aria:"Что такое синхронизация",
  help_what:"Синхронизация хранит журнал в твоём облаке и сама обновляет его на всех устройствах. Заполни один из двух вариантов.",
  help_google:"Google — файл на твоём Google Диске. Вставь URL веб-приложения Apps Script (script.google.com → Deploy → Web app → доступ «Anyone»).",
  help_gh:"GitHub — приватный gist. Вставь токен с правом «gist»; поле ID оставь пустым — создастся новый, его ID введи на втором устройстве.",
  head_playnite:"Playnite",head_data:"Данные",nodata_chip:"Без данных",
  dice_title:"Кубик судьбы",dice_genre:"Жанр",dice_any:"Любой",dice_any_f:"Любая",
  games_1:" игра",games_2:" игры",games_5:" игр",
  runs_1:" прохождение",runs_2:" прохождения",runs_5:" прохождений",
  dice_cs:"Оценка сообщества",dice_cs_any:"Любая",
  dice_lib:"Есть в библиотеке",dice_fresh:"Только нетронутые",dice_hold:"Учитывать отложенные",dice_series:"Серия",
  dice_pool:"В пуле: ",dice_roll:"🎲 Бросить",dice_quick:"Без фильтров",
  dice_reset:"Сбросить фильтры",dice_empty:"Пул пуст — ослабь фильтры",
  res_title:"Итоги",res_btn_aria:"Итоги по годам",res_close:"Закрыть",
  res_alltime:"Всё время",res_beaten:"Пройдено игр",res_runs:"Прохождений",
  res_hours:"Часов в играх",res_avg:"Средняя оценка",
  res_by_genres:"По жанрам",res_by_platforms:"По платформам",
  res_launchers:"По лончерам",res_by_year:"По годам",res_vs_prev:"К прошлому году",
  res_goty:"Игра года",res_goty_all:"Игра эпохи",res_longest:"Самая длинная",
  res_series:"Серия года",res_series_all:"Главная серия",
  res_empty:"За этот период прохождений нет",res_no_data:"—",
  rating_aria:"Оценка {r} из 5",settings_aria:"Настройки синхронизации",
  ref_similar:"Похоже на «{v}» — использовать это значение?",
  ref_new_plat:"Создать новую платформу «{v}»?",
  ref_new_src:"Создать новый лончер «{v}»?",
  bad_format:"не тот формат",file_desc:"Данные журнала",autosave:"автосохранение",not_dupes:"Не дубли",
  theme_aria:"Тема оформления",
  bak_auto:"Автобэкапы",bak_rollback:"Откатиться",bak_prerestore:"до отката",
  bak_confirm:"Заменить текущие данные бэкапом за {d}? Текущее состояние останется в пункте «до отката».",
  bak_rolled:"Откачено на ",
  gh_bad_token:" — токен не подошёл"
},
en:{
  st_backlog:"Backlog",st_playing:"Playing",st_done:"Beaten",st_dropped:"Dropped",st_onhold:"On hold",
  title:"Game Log",subtitle:"backlog · progress · completion history",
  stat_playing:"playing",stat_backlog:"backlog",stat_done:"beaten",
  tab_all_aria:"All games — home screen",tab_catalog:"Library",tab_fav:"⚑ Favorites",fav_on:"⚑ Add to favorites",fav_off:"⚑ Remove from favorites",search_ph:"Search games…",add_btn:"+ Add",prompt_name:"Game title:",
  dice_bar:"🎲 What to play? Let fate decide",dice_aria:"Random game from backlog",
  dice_none:"Backlog is empty — what an achievement!",dice_pick:"Fate has chosen: ",
  long_ago:"Way back",ago_short:"way back",done_old:"Beaten way back",replayed:"+ Replayed",
  add_year:"+ Beaten in…",remove_from:"Remove from “{y}”",del:"Delete",times:" times",
  confirm_del:"Delete “{n}” entirely, with all history?",
  no_runs_left:"No completions left — game returned to backlog",
  added_to:"added to ",platform:"Platform",launcher:"Launcher",name_ph:"Game title",rel_ph:"Release year",genres_ph:"Genres",series_ph:"Series",
  sort_default:"⇅ Default order",sort_name:"Alphabetical",sort_cs:"By community score",
  sort_rating:"By my rating",sort_rel:"By release year",sort_time:"By time played",
  merge_with:"⇆ Merge with “{n}”",merge_keep:"Keep which one:",cancel:"Cancel",nomerge_done:"Got it, not a duplicate. Restore anytime in settings",reset_nomerge:"Restore hidden duplicate pairs",ser_done:" beaten",nomerge_reset:"Hidden pairs will be suggested again",merged:"Merged: ",note_ph:"Game note — thoughts, where you stopped, what to remember…",
  h:" h",min:" min",cs_title:"Playnite community score",
  empty:"Nothing here yet.",empty_search:"Nothing found. Tap “+ Add” to add this game.",
  added_backlog:"Added to backlog: ",already:"is already in the list",
  sync:"sync",syncing:"syncing…",offline:"offline · saved locally",offline_local:"offline · local",
  storage_warn:"Storage unavailable — data won't persist in this window",
  gist_created:"Gist created. Copy its ID to your other devices",
  connected:"Connected — syncing",connected_drive:"Connected to Google Drive",
  need_token:"Paste an Apps Script URL or a GitHub token",bad_url:"URL must start with https://script.google.com/ and end with /exec",
  sync_off:"Sync disabled, data kept locally",
  gist_fail:"Couldn't create gist: ",
  imp_none:"No game rows found in the file",imp_nocol:"Couldn't find the Name column — check the export",
  imp_done:"Import: added ",imp_upd:", updated ",imp_fail:"Couldn't parse CSV: ",
  bak_done:"File downloaded — keep it somewhere safe",restored:"Restored from ",games_w:" games",
  not_backup:"This is not a log file: ",
  ph_gs:"Google Apps Script URL (…/exec)",or_gist:"— or via GitHub Gist —",
  ph_token:"GitHub token (scope: gist only)",ph_gist:"Gist ID (leave empty — I'll create one)",
  connect:"Connect",disconnect:"Disconnect",csv:"Import CSV",backup:"Backup",restore:"Restore",
  set_title:"Settings",lbl_lang:"Language",lbl_theme:"Theme",sync_spoiler:"Sync",
  sync_help_aria:"What is sync",
  help_what:"Sync keeps the log in your own cloud and updates it on every device. Fill in one of the two options.",
  help_google:"Google — a file on your Google Drive. Paste the Apps Script web-app URL (script.google.com → Deploy → Web app → access “Anyone”).",
  help_gh:"GitHub — a private gist. Paste a token with the “gist” scope; leave the ID empty — a new one is created, enter its ID on the second device.",
  head_playnite:"Playnite",head_data:"Data",nodata_chip:"No data",
  dice_title:"Dice of fate",dice_genre:"Genre",dice_any:"Any",dice_any_f:"Any",
  games_1:" game",games_2:" games",games_5:" games",
  runs_1:" playthrough",runs_2:" playthroughs",runs_5:" playthroughs",
  dice_cs:"Community score",dice_cs_any:"Any",
  dice_lib:"In my library",dice_fresh:"Untouched only",dice_hold:"Include on-hold",dice_series:"Series",
  dice_pool:"In the pool: ",dice_roll:"🎲 Roll",dice_quick:"No filters",
  dice_reset:"Reset filters",dice_empty:"Pool is empty — loosen the filters",
  res_title:"Results",res_btn_aria:"Yearly results",res_close:"Close",
  res_alltime:"All time",res_beaten:"Games beaten",res_runs:"Playthroughs",
  res_hours:"Hours played",res_avg:"Average rating",
  res_by_genres:"By genre",res_by_platforms:"By platform",
  res_launchers:"By launcher",res_by_year:"By year",res_vs_prev:"Vs last year",
  res_goty:"Game of the year",res_goty_all:"Game of the era",res_longest:"Longest game",
  res_series:"Series of the year",res_series_all:"Top series",
  res_empty:"No completions in this period",res_no_data:"—",
  rating_aria:"Rating {r} of 5",settings_aria:"Sync settings",
  ref_similar:"Looks like “{v}” — use it?",
  ref_new_plat:"Create new platform “{v}”?",
  ref_new_src:"Create new launcher “{v}”?",
  bad_format:"wrong format",file_desc:"Game log data",autosave:"autosave",not_dupes:"Not duplicates",
  theme_aria:"Theme",
  bak_auto:"Auto-backups",bak_rollback:"Roll back",bak_prerestore:"before rollback",
  bak_confirm:"Replace current data with the {d} backup? The current state will stay under “before rollback”.",
  bak_rolled:"Rolled back to ",
  gh_bad_token:" — token was rejected"
}};

export var lang = "en";
try { lang = localStorage.getItem(LKEY) || "en"; } catch (e) {}
if (!TR[lang]) lang = "ru";

export function setLang(l: string): void {
  lang = l;
  try { localStorage.setItem(LKEY, lang); } catch (err) {}
}

export function t(k: string): string {
  return (TR[lang] && TR[lang][k]) !== undefined ? TR[lang][k] : (TR.ru[k] || k);
}

export function stLabel(s: string): string {
  return t("st_" + s);
}

// RU numeral agreement: 1 → _1, 2–4 → _2, 5+ → _5 (with 11–14 exception)
function plural(n: number, key: string): string {
  if (lang === "ru") {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return t(key + "_1");
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return t(key + "_2");
    return t(key + "_5");
  }
  return n === 1 ? t(key + "_1") : t(key + "_5");
}

export function gamesWord(n: number): string { return plural(n, "games"); }
export function runsWord(n: number): string { return plural(n, "runs"); }
