# Ranking compartido (Supabase)

Sin configurar, cada móvil tiene su propio ranking. Con Supabase (gratis) todos los que juegan comparten el «Ranking de La Trolina».

## Puesta en marcha (una vez)

1. Entra en https://supabase.com → **Start your project** → inicia sesión (por ejemplo con GitHub).
2. **New project**: nombre `la-tirolina`, una contraseña de base de datos (guárdala tú; no hace falta para el juego), región en Europa, plan **Free**. Espera a que termine de crearse.
3. Menú izquierdo → **SQL Editor** → **New query** → pega todo `supabase/ranking.sql` → **Run** («Success. No rows returned»).
4. Copia la **Project URL** (`https://xxxx.supabase.co`) y la **Publishable key** (`sb_publishable_…`): botón **Connect** arriba, o **Project Settings → API Keys** / **Data API**.
5. Ponlas en `game/data/online-config.js` (`supabaseUrl`, `supabaseKey`) y publica.

La URL y la clave publicable son públicas por diseño (van dentro del juego). **Nunca** pongas la *secret key* ni la contraseña de la base de datos en el juego.

## Qué hace el juego

- Al firmar: guarda en el ranking del móvil (top 20) y sube la puntuación al compartido. Sin conexión, queda pendiente y se sube sola al abrir el juego o el ranking.
- Antes de firmar enseña el puesto que conseguirías en los dos rankings.
- Pantalla Ranking: «🌍 La Trolina (todos)» y «📱 Este móvil», con filtros por modo.

## Seguridad y moderación

- Reglas (RLS): cualquiera puede **leer** y **apuntarse**; nadie puede editar ni borrar desde el juego.
- Límites en la tabla: nombre de 1 a 14 caracteres, puntuación entre 0 y 5.000.000, modo válido.
- Como cualquier ranking web sin cuentas, alguien con conocimientos podría mandar una puntuación inventada. Para borrar una entrada: Supabase → **Table Editor** → `ranking` → selecciona la fila → borrar.

## Código

`game/net/ranking-online.js` (`TrolinaOnlineRanking`: `top`, `position`, `submit`, `flush`) usa la API REST con `fetch` y la clave en la cabecera `apikey`. Pruebas con un servidor simulado: `?rankapi=http://localhost:PUERTO`.
