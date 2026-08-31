"use client";
import { useState, useMemo } from "react";
import { Users, Shirt, Package, Search } from "lucide-react";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const cargarDatos = async () => {
  const [
    { data: datosPersonal, error: errorPersonal },
    { data: datosInventario, error: errorInventario },
    { data: datosEntregas, error: errorEntregas }
  ] = await Promise.all([
    supabase.from("personal").select("*").order("nombre"),
    supabase.from("inventario").select("*"),
    supabase
      .from("entregas")
      .select(`
        id,
        producto,
        talla,
        entregado_en,
        personal (
          nombre,
          dni
        )
      `)
      .order("entregado_en", { ascending: false })
  ]);

  if (errorPersonal || errorInventario || errorEntregas) {
    console.error(errorPersonal || errorInventario || errorEntregas);
    alert("No se pudo conectar con la base de datos.");
    return;
  }

  setPersonal(datosPersonal || []);
  setInventarioChalecos(
    TALLAS.reduce((resultado, talla) => {
      const fila = datosInventario?.find(
        item => item.producto === "chaleco" && item.talla === talla
      );
      resultado[talla] = fila?.stock ?? 0;
      return resultado;
    }, {})
  );

  setInventarioPolos(
    TALLAS.reduce((resultado, talla) => {
      const fila = datosInventario?.find(
        item => item.producto === "polo" && item.talla === talla
      );
      resultado[talla] = fila?.stock ?? 0;
      return resultado;
    }, {})
  );

  setEntregas(
    (datosEntregas || []).map(entrega => ({
      id: entrega.id,
      persona: entrega.personal?.nombre || "Sin nombre",
      dni: entrega.personal?.dni || "-",
      tipo: entrega.producto,
      talla: entrega.talla,
      fecha: new Date(entrega.entregado_en).toLocaleString("es-PE")
    }))
  );
};

useEffect(() => {
  cargarDatos();
}, []);

const CARGOS = [
  "JEFE DE ODPE",
  "CAODPE",
  "LOGISTICO",
  "ANALISTA DE RECURSOS HUMANOS",
  "AUXILIAR DE RRHH T1",
  "AUXILIAR DE RRHH T2",
  "COORDINADOR DE CAPACITACION",
  "COORDINADOR DE COMUNICACIONES",
  "AUXILIAR TECNICO DIURNO",
  "AUXILIAR TECNICO NOCTURNO",
  "ASISTENTE DE FINANZAS",
  "ASISTENTE LEGAL",
  "COORDINADOR DE OPERACIONES",
  "ASISTENTE OFICINA T1",
  "ASISTENTE DE OFICINA T2",
  "AUXILIAR ADMINISTRATIVO T1",
  "AUXILIAR ADMINISTRATIVO T2",
  "AUXILIAR DE OPERACIONES T1",
  "AUXILIAR LOGISTICO T1",
  "COORDINADOR DISTRITAL G1",
  "CAPACITADOR",
  "COORDINADOR DE LOCAL DE VOTACION",
  "COORDINADOR DE MESA",
  "RESPONSABLE DE CENTRO DE ACOPIO",
  "AUXILIAR DE CENTRO DE ACOPIO",
  "ORIENTADOR",
  "AUXILIAR DE REPLIEGUE DE ACTAS",
  "ENCARGADO DE CENTRO DE COMPUTO DESCENTRALIZADO",
  "ASISTENTE DE CENTRO DE COMPUTO DESCENTRALIZADO",
  "OPERADOR DE COMPUTO",
  "AUXILIAR DE CENTRO DE COMPUTO",
  "RESPONSABLE DE LINEA DE RECEPCION",
  "OPERADOR DE LINEA DE RECEPCION",
];

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function App() {
  const [modulo, setModulo] = useState("inventario");
  
  // Inventario
  const [inventarioChalecos, setInventarioChalecos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );
  const [inventarioPolos, setInventarioPolos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );

  // Personal
  const [personal, setPersonal] = useState([]);
  const [textoPersonal, setTextoPersonal] = useState("");
  const [cargoSeleccionado, setCargoSeleccionado] = useState("");
  const [busquedaCargo, setBusquedaCargo] = useState("");

  // Entregas
  const [entregas, setEntregas] = useState([]);
  const [personaSeleccionada, setPersonaSeleccionada] = useState("");
  const [tipoPrenda, setTipoPrenda] = useState("chaleco");
  const [tallaSeleccionada, setTallaSeleccionada] = useState("M");
  const [busquedaPersona, setBusquedaPersona] = useState("");

  // Procesar texto de personal
  const procesarPersonal = async () => {
  if (!cargoSeleccionado) {
    alert("Primero seleccione un cargo.");
    return;
  }

  const lineas = textoPersonal
    .trim()
    .split("\n")
    .filter(linea => linea.trim());

  const nuevos = [];

  for (const linea of lineas) {
    const partes = linea.trim().split(/\s+/);

    const dni = partes.find(item => /^\d{8}$/.test(item));
    const celular = partes.find(item => /^\d{9}$/.test(item));
    const nombre = partes
      .filter(item => !/^\d{8}$/.test(item) && !/^\d{9}$/.test(item))
      .join(" ");

    if (nombre && dni && celular) {
      nuevos.push({
        nombre,
        dni,
        celular,
        cargo: cargoSeleccionado
      });
    }
  }

  if (nuevos.length === 0) {
    alert("No se encontraron registros válidos.");
    return;
  }

  const { error } = await supabase
    .from("personal")
    .upsert(nuevos, { onConflict: "dni" });

  if (error) {
    alert("No se pudo guardar el personal: " + error.message);
    return;
  }

  alert(`${nuevos.length} persona(s) registrada(s) correctamente.`);
  setTextoPersonal("");
  await cargarDatos();
};

  // Filtrar cargos
  const cargosFiltrados = useMemo(() => {
    if (!busquedaCargo) return CARGOS;
    return CARGOS.filter(c => 
      c.toLowerCase().includes(busquedaCargo.toLowerCase())
    );
  }, [busquedaCargo]);

  // Filtrar personas
  const personasFiltradas = useMemo(() => {
    if (!busquedaPersona) return personal;
    return personal.filter(p => 
      p.nombre.toLowerCase().includes(busquedaPersona.toLowerCase()) ||
      p.dni.includes(busquedaPersona)
    );
  }, [busquedaPersona, personal]);

  // Registrar entrega
  const registrarEntrega = async () => {
  if (!personaSeleccionada || !tallaSeleccionada) {
    alert("Seleccione una persona y una talla.");
    return;
  }

  const producto = tipoPrenda === "chaleco" ? "chaleco" : "polo";

  const { error } = await supabase.rpc("registrar_entrega_prenda", {
    p_personal_id: personaSeleccionada,
    p_producto: producto,
    p_talla: tallaSeleccionada
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Entrega registrada correctamente.");
  setPersonaSeleccionada("");
  setTallaSeleccionada("M");
  await cargarDatos();
};

const actualizarStock = async (producto, talla, valor) => {
  const stock = Math.max(0, Number(valor) || 0);

  const { error } = await supabase
    .from("inventario")
    .update({
      stock,
      actualizado_en: new Date().toISOString()
    })
    .eq("producto", producto)
    .eq("talla", talla);

  if (error) {
    alert("No se pudo actualizar el inventario: " + error.message);
    return;
  }

  if (producto === "chaleco") {
    setInventarioChalecos(prev => ({ ...prev, [talla]: stock }));
  } else {
    setInventarioPolos(prev => ({ ...prev, [talla]: stock }));
  }
};



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">
          Sistema de Inventario - Chalecos y Polos
        </h1>
      </header>

      {/* Navegación */}
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => setModulo("inventario")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              modulo === "inventario" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Package size={20} />
            Inventario
          </button>
          <button
            onClick={() => setModulo("personal")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              modulo === "personal" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Users size={20} />
            Personal
          </button>
          <button
            onClick={() => setModulo("entregas")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              modulo === "entregas" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Shirt size={20} />
            Entregas
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto p-4">
        {/* Módulo Inventario */}
        {modulo === "inventario" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
              Gestión de Inventario
            </h2>
            
            {/* Chalecos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Chalecos (2 velcros)
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {TALLAS.map(talla => (
                  <div key={talla} className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {talla}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inventarioChalecos[talla]}
                      onChange={(e) => actualizarStock("chaleco", talla, e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 text-center focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Polos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Polos (manga corta)
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {TALLAS.map(talla => (
                  <div key={talla} className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {talla}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inventarioPolos[talla]}
                      onChange={(e) => actualizarStock("polo", talla, e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 text-center focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Resumen del inventario:</h4>
              <p className="text-sm">
                Total chalecos: {Object.values(inventarioChalecos).reduce((a, b) => a + b, 0)} | 
                Total polos: {Object.values(inventarioPolos).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Módulo Personal */}
        {modulo === "personal" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
              Registro de Personal
            </h2>

            {/* Carga masiva */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Cargar personal desde texto
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar cargo para este lote:
                </label>
                <input
                  type="text"
                  value={busquedaCargo}
                  onChange={(e) => setBusquedaCargo(e.target.value)}
                  placeholder="Buscar cargo..."
                  className="w-full border-2 border-gray-300 rounded-lg p-2 mb-2 focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={cargoSeleccionado}
                  onChange={(e) => setCargoSeleccionado(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione un cargo --</option>
                  {cargosFiltrados.map(cargo => (
                    <option key={cargo} value={cargo}>{cargo}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={textoPersonal}
                onChange={(e) => setTextoPersonal(e.target.value)}
                placeholder="Ejemplo:
RIXE TARAZONA JOSE  20017031    949631751
URBANO ALVARADO DELY ISABEL  41903921    982601073"
                className="w-full h-40 border-2 border-gray-300 rounded-lg p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
              
              <button
                onClick={procesarPersonal}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Procesar y Agregar
              </button>
            </div>

            {/* Lista de personal */}
            {personal.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Personal registrado ({personal.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">DNI</th>
                        <th className="p-2 text-left">Celular</th>
                        <th className="p-2 text-left">Cargo</th>
                        <th className="p-2 text-left">Chaleco</th>
                        <th className="p-2 text-left">Polo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2">{p.nombre}</td>
                          <td className="p-2">{p.dni}</td>
                          <td className="p-2">{p.celular}</td>
                          <td className="p-2">{p.cargo}</td>
                          <td className="p-2">{p.chaleco || "-"}</td>
                          <td className="p-2">{p.polo || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Módulo Entregas */}
        {modulo === "entregas" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
              Control de Entregas
            </h2>

            {/* Formulario de entrega */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Registrar nueva entrega
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Buscar persona */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar persona:
                  </label>
                  <input
                    type="text"
                    value={busquedaPersona}
                    onChange={(e) => setBusquedaPersona(e.target.value)}
                    placeholder="Nombre o DNI..."
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={personaSeleccionada}
                    onChange={(e) => setPersonaSeleccionada(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 mt-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccione persona --</option>
                    {personasFiltradas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.dni}) - {p.cargo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo y talla */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de prenda:
                    </label>
                    <select
                      value={tipoPrenda}
                      onChange={(e) => setTipoPrenda(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="chaleco">Chaleco</option>
                      <option value="polo">Polo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Talla:
                    </label>
                    <select
                      value={tallaSeleccionada}
                      onChange={(e) => setTallaSeleccionada(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                    >
                      {TALLAS.map(talla => (
                        <option key={talla} value={talla}>
                          {talla} - Stock: {
                            tipoPrenda === "chaleco" 
                              ? inventarioChalecos[talla] 
                              : inventarioPolos[talla]
                          }
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={registrarEntrega}
                className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition w-full md:w-auto"
              >
                Registrar Entrega
              </button>
            </div>

            {/* Historial de entregas */}
            {entregas.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Historial de entregas ({entregas.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Fecha</th>
                        <th className="p-2 text-left">Persona</th>
                        <th className="p-2 text-left">DNI</th>
                        <th className="p-2 text-left">Prenda</th>
                        <th className="p-2 text-left">Talla</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entregas.map((e, i) => (
                        <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2">{e.fecha}</td>
                          <td className="p-2">{e.persona}</td>
                          <td className="p-2">{e.dni}</td>
                          <td className="p-2 capitalize">{e.tipo}</td>
                          <td className="p-2">{e.talla}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}