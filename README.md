# Carbon Black · parrilla a las brasas

Concepto de diseño de una web para una parrilla en Caracas: no es un restaurante real.

**En vivo:** https://carbon-black-parrilla.vercel.app

## Qué tiene

- **Portada en 3D (Three.js)**: al bajar, un trozo de carbón se parte y deja ver su interior encendido; los trozos caen sobre una parrilla de hierro, se acumulan como brasas y prenden **llamas reales** que crecen hasta cubrir la escena.
- **Soplar las brasas**: al mantener presionado sobre el carbón, se pone al rojo, suelta chispas y suena un chisporroteo (generado en el navegador, sin archivo de audio).
- **Videos que avanzan con el scroll**, codificados con un cuadro clave cada 4 para que sigan al dedo sin trabarse.
- **Arma tu plato**: eliges término, humo y acompañante; la web te dice el plato y su precio, y una foto real del corte por dentro cambia con una transición (jugoso, a punto, bien cocido).
- **Menú completo**: 16 platos en 5 pestañas (cortes, achuras, acompañantes, vinos, postres), con vista previa en video y una ficha por plato con porción, término recomendado y maridaje.
- **Reservas por WhatsApp**: día, hora, personas y ocasión; arma el mensaje listo para enviar y valida los datos.
- **Horario en vivo** con la hora de Caracas ("Abierto ahora" / "Cerrado · abre a las…"), mapa y reseñas que se deslizan.

## Detalles técnicos

- Las llamas no son un video: son 48 cuadros de un video real juntos en una sola imagen que un shader va pasando, y el mismo shader vuelve transparente el fondo negro. Así no usan el decodificador de video, que se saturaba y trababa el scroll.
- La pantalla de carga precompila la escena 3D para que no haya saltos a mitad del scroll, y la escena solo se dibuja cuando está en pantalla.
- Peor cuadro al recorrer la portada: 17 ms, también con la CPU 4 veces más lenta. 0 problemas de accesibilidad en axe (WCAG 2 A/AA).

## Tecnología

HTML, CSS y JavaScript sin framework · Three.js · Lenis · Vercel

## Créditos

Fotos y videos de [Pexels](https://www.pexels.com) (licencia libre de Pexels). Números de cada uno en Pexels:

- **Fotos:** 8021097, 36543116, 27018939, 36782563, 37112856, 36798134, 39022496, 28893439, 27643002, 34003516, 36319691, 8279862, 36683006, 5059472, 9500275, 13004116, 36734926, 36869210, 9604576, 8299597, 3743537, 17631170, 34474024, 32704435, 35116032, 8694617, 36669799
- **Videos:** 12605103, 3209830, 1231765, 33461237, 7613411 y 5659678 (cuadros de las llamas)
