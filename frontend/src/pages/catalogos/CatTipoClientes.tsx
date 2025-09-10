import CatalogScaffold from "./_CatalogScaffold";

export default function CatCategoriaProductos(){
  return (
    <CatalogScaffold
      titulo="Catálogo: Categorías de producto"
      placeholderBusqueda="Buscar categoría…"
      initialData={[
        { id: 1, nombre: "Lazos de nylon", descripcion: "Resistentes" },
        { id: 2, nombre: "Lazos de algodón", descripcion: "Económicos" },
        { id: 3, nombre: "Accesorios", descripcion: "Complementos" },
      ]}
    />
  );
}
