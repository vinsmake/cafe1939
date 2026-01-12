En `functions.php` se agrega este código que activa las miniaturas y expone las variantes de la imagen destacada en la REST API:

```php
function coffee_shop_api_init()
{
    register_rest_field(
        array('page'),
        'featured_images',
        array('get_callback' => 'get_featured_image')
    );
}
add_action('rest_api_init', 'coffee_shop_api_init');

function get_featured_image($post)
{
    if (! $post['featured_media']) {
        return false;
    }

    $image_sizes = get_intermediate_image_sizes();
    $images = array();

    foreach ($image_sizes as $size) {
        if ($size === '2048x2048') continue;

        $image = wp_get_attachment_image_src($post['featured_media'], $size);

        $images[$size === '1536x1536' ? 'full' : $size] = array(
            'url'    => $image[0],
            'width'  => $image[1],
            'height' => $image[2],
        );
    }

    return $images;
}

```

Esto permite que:

- WordPress genere y soporte imágenes destacadas (`post-thumbnails`) para el tema.
- La REST API incluya un nuevo campo `featured_images` en las respuestas de `page`.
- Los clientes que consumen la API reciban un objeto con las diferentes variantes (por tamaño) de la imagen destacada: URL, ancho y alto por cada tamaño, listo para decidir qué versión usar en el frontend.

---

En astro.config.mjs se configura la lista de dominios permitidos para que Astro pueda optimizar imágenes remotas. Añade (o confirma) la siguiente entrada:

```jsx
export default defineConfig({
    // ...
    image: {
        domains: ['coffeeshop.local']
    }
});

```

Esto permite que:

- El componente de imágenes de Astro (p. ej. `<Picture>` de `astro:assets`) pueda procesar y optimizar URLs que provienen de `coffeeshop.local` (tu WordPress local).
- Astro genere versiones en formatos modernos (avif/webp) y gestione el dimensionado en el servidor de desarrollo/producción.

---

En index.ts se define el esquema esperado de la API para validar los datos de imagen antes de usarlos:

```tsx
**const imageSchema = z.object({
    url: z.string(),
    width: z.number(),
    height: z.number()
})**

**const featuredImagesSchema = z.object({
    thumbnail: imageSchema,
    medium: imageSchema,
    medium_large: imageSchema,
    large: imageSchema,
    full: imageSchema,
});**

export const BaseWPSchema = z.object({
    id: z.number(),
    title: z.object({
        rendered: z.string()
    }),
    content: z.object({
        rendered: z.string()
    }),
    **featured_images: featuredImagesSchema,**
    acf: z.object({
        subtitle: z.string()
    })
});

```

Esto permite que:

- Al parsear la respuesta con `BaseWPSchema.parse(...)` tengas garantías de que `featured_images` contiene las claves y tipos esperados (`url`, `width`, `height`), evitando errores en tiempo de ejecución en el frontend.
- Detectes temprano cambios o inconsistencias entre lo que WP expone y lo que tu UI espera.

---

En nosotros.astro se consume la API y se usan las variantes de imagen:

```
const url = '<http://coffeeshop.local/wp-json/wp/v2/pages/?slug=nosotros>'
const res = await fetch(url);
const json = await res.json();
const data = BaseWPSchema.parse(json[0]);

```

Y luego se usan las imágenes en el template:

```
<Layout
  title={data.title.rendered}
  subtitle={data.acf.subtitle}
  bgImage={data.featured_images.full.url}
>
  <Picture
    src={data.featured_images.medium_large.url}
    alt={`Imagen de ${data.title.rendered}`}
    width={data.featured_images.medium_large.width}
    height={data.featured_images.medium_large.height}
    formats={['avif', 'webp']}
  ></Picture>
  ...
</Layout>

```

Esto permite que:

- El frontend pida la página `nosotros` y reciba `featured_images`.
- Se utilice la versión `full` como fondo (`bgImage`) y `medium_large` para la imagen dentro del contenido, escogiendo tamaños apropiados para el layout.
- `<Picture>` aproveche `width`/`height` y astro.config.mjs para servir imágenes optimizadas en `avif`/`webp`.

---

En Layout.astro se recibe `bgImage` y se integra en la estructura del layout:

```
type Props = {
  title: string;
  subtitle?: string;
  bgImage: string;
};
const { title, subtitle, bgImage } = Astro.props;
...
<Header bgImage={bgImage} subtitle={subtitle} />

```

Esto permite que:

- Todas las páginas que usan `Layout` reciban y muestren un fondo coherente desde la imagen destacada enviada por WordPress.
- Centralizar el uso de `bgImage` para consistencia visual y facilidad de mantenimiento.