"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Shirt, Package, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { supabase } from "../lib/supabase";

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
  "ASISTENTE EN AUDITORIA",
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
  const [modulo, setModulo] = useState("entregas");

  // Estado para sistema de Notificaciones con Diseño
  const [notificacion, setNotificacion] = useState({
    visible: false,
    mensaje: "",
    tipo: "exito" // 'exito' | 'error'
  });

  const mostrarNotificacion = (mensaje, tipo = "exito") => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Inventario
  const [inventarioChalecos, setInventarioChalecos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );
  const [inventarioPolos, setInventarioPolos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );

  // Formulario para añadir inventario
  const [invProducto, setInvProducto] = useState("chaleco");
  const [invTalla, setInvTalla] = useState("M");
  const [invCantidad, setInvCantidad] = useState(1);

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

  // Filtros de Reporte
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

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
            dni,
            cargo
          )
        `)
        .order("entregado_en", { ascending: false })
    ]);

    if (errorPersonal || errorInventario || errorEntregas) {
      console.error(errorPersonal || errorInventario || errorEntregas);
      mostrarNotificacion("No se pudo conectar con la base de datos.", "error");
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
        cargo: entrega.personal?.cargo || "-",
        tipo: entrega.producto,
        talla: entrega.talla,
        fechaRaw: entrega.entregado_en,
        fecha: new Date(entrega.entregado_en).toLocaleString("es-PE")
      }))
    );
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Sumar stock
  const agregarStock = async () => {
    const cantidadASumar = Math.max(1, Number(invCantidad) || 0);
    const stockActual = invProducto === "chaleco" 
      ? inventarioChalecos[invTalla] 
      : inventarioPolos[invTalla];

    const nuevoStock = stockActual + cantidadASumar;

    const { error } = await supabase
      .from("inventario")
      .update({
        stock: nuevoStock,
        actualizado_en: new Date().toISOString()
      })
      .eq("producto", invProducto)
      .eq("talla", invTalla);

    if (error) {
      mostrarNotificacion("No se pudo actualizar el inventario: " + error.message, "error");
      return;
    }

    mostrarNotificacion(`Se ingresaron +${cantidadASumar} unidades a ${invProducto.toUpperCase()} (${invTalla})`);
    setInvCantidad(1);
    await cargarDatos();
  };

  // Procesar texto de personal
  const procesarPersonal = async () => {
    if (!cargoSeleccionado) {
      mostrarNotificacion("Primero seleccione un cargo.", "error");
      return;
    }

    const lineas = textoPersonal.trim().split("\n").filter(linea => linea.trim());
    const nuevos = [];

    for (const linea of lineas) {
      const partes = linea.trim().split(/\s+/);
      const dni = partes.find(item => /^\d{8}$/.test(item));
      const celular = partes.find(item => /^\d{9}$/.test(item));
      const nombre = partes
        .filter(item => !/^\d{8}$/.test(item) && !/^\d{9}$/.test(item))
        .join(" ");

      if (nombre && dni && celular) {
        nuevos.push({ nombre, dni, celular, cargo: cargoSeleccionado });
      }
    }

    if (nuevos.length === 0) {
      mostrarNotificacion("No se encontraron registros válidos.", "error");
      return;
    }

    const { error } = await supabase.from("personal").upsert(nuevos, { onConflict: "dni" });

    if (error) {
      mostrarNotificacion("No se pudo guardar el personal: " + error.message, "error");
      return;
    }

    mostrarNotificacion(`${nuevos.length} persona(s) registrada(s) correctamente.`);
    setTextoPersonal("");
    await cargarDatos();
  };

  // Filtrar cargos y personas
  const cargosFiltrados = useMemo(() => {
    if (!busquedaCargo) return CARGOS;
    return CARGOS.filter(c => c.toLowerCase().includes(busquedaCargo.toLowerCase()));
  }, [busquedaCargo]);

  const personasFiltradas = useMemo(() => {
    if (!busquedaPersona) return personal;
    return personal.filter(p => 
      p.nombre.toLowerCase().includes(busquedaPersona.toLowerCase()) ||
      p.dni.includes(busquedaPersona)
    );
  }, [busquedaPersona, personal]);

  // Filtrar Entregas
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(item => {
      const coincideBusqueda = 
        !filtroBusqueda ||
        item.persona.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        item.dni.includes(filtroBusqueda);

      const coincideCargo = !filtroCargo || item.cargo === filtroCargo;

      let coincideFecha = true;
      const fechaEntrega = item.fechaRaw ? new Date(item.fechaRaw) : null;

      if (filtroFechaDesde && fechaEntrega) {
        const desde = new Date(filtroFechaDesde + "T00:00:00");
        if (fechaEntrega < desde) coincideFecha = false;
      }

      if (filtroFechaHasta && fechaEntrega) {
        const hasta = new Date(filtroFechaHasta + "T23:59:59");
        if (fechaEntrega > hasta) coincideFecha = false;
      }

      return coincideBusqueda && coincideCargo && coincideFecha;
    });
  }, [entregas, filtroBusqueda, filtroCargo, filtroFechaDesde, filtroFechaHasta]);

  // Registrar entrega
  const registrarEntrega = async () => {
    if (!personaSeleccionada || !tallaSeleccionada) {
      mostrarNotificacion("Seleccione una persona y una talla.", "error");
      return;
    }

    const { error } = await supabase.rpc("registrar_entrega_prenda", {
      p_personal_id: personaSeleccionada,
      p_producto: tipoPrenda,
      p_talla: tallaSeleccionada
    });

    if (error) {
      mostrarNotificacion(error.message, "error");
      return;
    }

    mostrarNotificacion("Entrega registrada exitosamente.");
    setPersonaSeleccionada("");
    setTallaSeleccionada("M");
    await cargarDatos();
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      
      {/* Componente Toast de Notificación con Diseño */}
      {notificacion.visible && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
              notificacion.tipo === "exito"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-red-600 text-white border-red-500"
            }`}
          >
            {notificacion.tipo === "exito" ? (
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-200" />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-200" />
            )}
            <p className="font-medium text-sm">{notificacion.mensaje}</p>
            <button
              onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))}
              className="ml-auto text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
            onClick={() => setModulo("entregas")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "entregas" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Shirt size={20} />
            Entregas
          </button>
          <button
            onClick={() => setModulo("inventario")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "inventario" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Package size={20} />
            Inventario
          </button>
          <button
            onClick={() => setModulo("personal")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "personal" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Users size={20} />
            Personal
          </button>
          <button
            onClick={() => setModulo("reportes")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
              modulo === "reportes" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FileText size={20} />
            Reportes
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto p-4">

        {/* 1. Módulo Entregas */}
        {modulo === "entregas" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Control de Entregas</h2>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Registrar nueva entrega</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar persona:</label>
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

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de prenda:</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Talla:</label>
                    <select
                      value={tallaSeleccionada}
                      onChange={(e) => setTallaSeleccionada(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                    >
                      {TALLAS.map(talla => (
                        <option key={talla} value={talla}>
                          {talla} - Stock: {tipoPrenda === "chaleco" ? inventarioChalecos[talla] : inventarioPolos[talla]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={registrarEntrega}
                className="mt-6 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition w-full md:w-auto font-medium shadow-md"
              >
                Registrar Entrega
              </button>
            </div>

            {entregas.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Últimas entregas ({entregas.length})</h3>
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
                      {entregas.slice(0, 10).map((e, i) => (
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

        {/* 2. Módulo Inventario */}
        {modulo === "inventario" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Inventario</h2>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
              <h3 className="text-lg font-semibold mb-2">Registrar ingreso de nuevo paquete</h3>
              <p className="text-sm text-gray-600 mb-4">Selecciona el producto, la talla e ingresa la cantidad recibida para sumarla al stock actual.</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenda:</label>
                  <select
                    value={invProducto}
                    onChange={(e) => setInvProducto(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="chaleco">Chaleco</option>
                    <option value="polo">Polo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla:</label>
                  <select
                    value={invTalla}
                    onChange={(e) => setInvTalla(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  >
                    {TALLAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a ingresar:</label>
                  <input
                    type="number"
                    min="1"
                    value={invCantidad}
                    onChange={(e) => setInvCantidad(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={agregarStock}
                  className="bg-blue-600 text-white font-medium p-2 rounded-lg hover:bg-blue-700 transition shadow"
                >
                  Registrar / Sumar Stock
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Chalecos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-blue-50 rounded-lg text-center">
                      <span className="block font-bold text-gray-600">{talla}</span>
                      <span className="text-2xl font-black text-blue-700">{inventarioChalecos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Polos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-emerald-50 rounded-lg text-center">
                      <span className="block font-bold text-gray-600">{talla}</span>
                      <span className="text-2xl font-black text-emerald-700">{inventarioPolos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 text-center text-sm font-semibold text-gray-700">
              Total Chalecos: {Object.values(inventarioChalecos).reduce((a, b) => a + b, 0)} | Total Polos: {Object.values(inventarioPolos).reduce((a, b) => a + b, 0)}
            </div>
          </div>
        )}

        {/* 3. Módulo Personal */}
        {modulo === "personal" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Registro de Personal</h2>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Cargar personal desde texto</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar cargo para este lote:</label>
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
RIXE TARAZONA JOSE  20017031    949631751"
                className="w-full h-40 border-2 border-gray-300 rounded-lg p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
              
              <button
                onClick={procesarPersonal}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow"
              >
                Procesar y Agregar
              </button>
            </div>

            {personal.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Personal registrado ({personal.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">DNI</th>
                        <th className="p-2 text-left">Celular</th>
                        <th className="p-2 text-left">Cargo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2">{p.nombre}</td>
                          <td className="p-2">{p.dni}</td>
                          <td className="p-2">{p.celular}</td>
                          <td className="p-2">{p.cargo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Módulo Reportes */}
        {modulo === "reportes" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Reporte de Entregas</h2>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Filtros de búsqueda</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Persona / DNI:</label>
                  <input
                    type="text"
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    placeholder="Nombre o DNI..."
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo:</label>
                  <select
                    value={filtroCargo}
                    onChange={(e) => setFiltroCargo(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="">-- Todos los cargos --</option>
                    {CARGOS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde:</label>
                  <input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {(filtroBusqueda || filtroCargo || filtroFechaDesde || filtroFechaHasta) && (
                <button
                  onClick={() => {
                    setFiltroBusqueda("");
                    setFiltroCargo("");
                    setFiltroFechaDesde("");
                    setFiltroFechaHasta("");
                  }}
                  className="mt-4 text-sm text-red-600 hover:underline font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Resultados ({entregasFiltradas.length})</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Persona</th>
                      <th className="p-2 text-left">DNI</th>
                      <th className="p-2 text-left">Cargo</th>
                      <th className="p-2 text-left">Prenda</th>
                      <th className="p-2 text-left">Talla</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entregasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-gray-500">
                          No se encontraron entregas que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      entregasFiltradas.map((e, i) => (
                        <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2">{e.fecha}</td>
                          <td className="p-2">{e.persona}</td>
                          <td className="p-2">{e.dni}</td>
                          <td className="p-2">{e.cargo}</td>
                          <td className="p-2 capitalize">{e.tipo}</td>
                          <td className="p-2">{e.talla}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}