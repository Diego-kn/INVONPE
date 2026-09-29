"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Shirt, Package, FileText, CheckCircle2, AlertCircle, X, History } from "lucide-react";
import { supabase } from "../lib/supabase";
import * as XLSX from 'xlsx';
import Image from "next/image";
import Swal from 'sweetalert2';

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
  "AUXILIAR DE OPERACIONES T2",
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
  "ASISTENTE DE DIFUSION DE REGION",
];

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export default function App() {
  const [modulo, setModulo] = useState("entregas");

  // Estados principales de datos
  const [entregas, setEntregas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [inventarioChalecos, setInventarioChalecos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );
  const [inventarioPolos, setInventarioPolos] = useState(
    TALLAS.reduce((acc, talla) => ({ ...acc, [talla]: 0 }), {})
  );
  const [inventarioGorros, setInventarioGorros] = useState(0);

  // Formulario de Nueva Entrega Múltiple
  const [personaSeleccionada, setPersonaSeleccionada] = useState("");
  const [busquedaPersona, setBusquedaPersona] = useState("");
  
  // Selección múltiple de prendas
  const [incluirChaleco, IncluirChalecoSet] = useState(true);
  const [tallaChaleco, setTallaChaleco] = useState("M");

  const [incluirPolo, incluirPoloSet] = useState(false);
  const [tallaPolo, setTallaPolo] = useState("M");

  const [incluirGorro, incluirGorroSet] = useState(false);

  // Notificaciones Toast
  const [notificacion, setNotificacion] = useState({
    visible: false,
    mensaje: "",
    tipo: "exito"
  });

  const mostrarNotificacion = (mensaje, tipo = "exito") => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Carga de datos desde Supabase
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
          personal_id,
          personal (
            id,
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

    const filaGorro = datosInventario?.find(
      item => item.producto === "gorro"
    );
    setInventarioGorros(filaGorro?.stock ?? 0);

    setEntregas(
      (datosEntregas || []).map(entrega => ({
        id: entrega.id,
        personalId: entrega.personal_id || entrega.personal?.id,
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

  // Registrar múltiples prendas en simultáneo
  const registrarEntregaMultiple = async () => {
    if (!personaSeleccionada) {
      mostrarNotificacion("Seleccione una persona.", "error");
      return;
    }

    if (!incluirChaleco && !incluirPolo && !incluirGorro) {
      mostrarNotificacion("Debe seleccionar al menos una prenda para registrar.", "error");
      return;
    }

    const tareas = [];

    if (incluirChaleco) {
      tareas.push(
        supabase.rpc("registrar_entrega_prenda", {
          p_personal_id: personaSeleccionada,
          p_producto: "chaleco",
          p_talla: tallaChaleco
        })
      );
    }

    if (incluirPolo) {
      tareas.push(
        supabase.rpc("registrar_entrega_prenda", {
          p_personal_id: personaSeleccionada,
          p_producto: "polo",
          p_talla: tallaPolo
        })
      );
    }

    if (incluirGorro) {
      tareas.push(
        supabase.rpc("registrar_entrega_prenda", {
          p_personal_id: personaSeleccionada,
          p_producto: "gorro",
          p_talla: null
        })
      );
    }

    const resultados = await Promise.all(tareas);
    const errorEncontrado = resultados.find(r => r.error);

    if (errorEncontrado) {
      mostrarNotificacion(errorEncontrado.error.message, "error");
      return;
    }

    mostrarNotificacion("Entregas registradas exitosamente.");
    setPersonaSeleccionada("");
    IncluirChalecoSet(true);
    incluirPoloSet(false);
    incluirGorroSet(false);
    await cargarDatos();
  };

  // Función con confirmación para Estado de Personal
  const handleCambiarPrendaEstado = async (personalId, tipoPrenda, tallaActual, event) => {
    const nuevaTallaValor = event.target.value;
    if (tallaActual === nuevaTallaValor) return;

    const esEliminacion = nuevaTallaValor === "NO";

    const confirmacion = await Swal.fire({
      title: esEliminacion ? '¿Quitar esta prenda?' : '¿Confirmar cambio o asignación?',
      text: esEliminacion 
        ? `Se retirará el ${tipoPrenda} y se devolverá al inventario.` 
        : `Se actualizará el registro de ${tipoPrenda} a la talla ${nuevaTallaValor} ajustando el inventario.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, realizar acción',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
      await cargarDatos();
      return;
    }

    if (esEliminacion) {
      const entregaActual = entregas.find(e => e.personalId === personalId && e.tipo === tipoPrenda);
      if (entregaActual) {
        const { error } = await supabase.from("entregas").delete().eq("id", entregaActual.id);
        if (error) {
          mostrarNotificacion("Error al quitar la prenda: " + error.message, "error");
          await cargarDatos();
          return;
        }
        mostrarNotificacion("Prenda retirada correctamente.");
        await cargarDatos();
      }
      return;
    }

    const entregaActual = entregas.find(e => e.personalId === personalId && e.tipo === tipoPrenda);
    
    if (entregaActual) {
      const { error } = await supabase.rpc("cambiar_talla_entrega", {
        p_entrega_id: entregaActual.id,
        p_nueva_talla: nuevaTallaValor
      });

      if (error) {
        mostrarNotificacion("Error al actualizar la talla: " + error.message, "error");
        await cargarDatos();
        return;
      }
      mostrarNotificacion(`Talla actualizada a ${nuevaTallaValor} correctamente.`);
      await cargarDatos();
    } else {
      const { error } = await supabase.rpc("registrar_entrega_prenda", {
        p_personal_id: personalId,
        p_producto: tipoPrenda,
        p_talla: tipoPrenda === "gorro" ? null : nuevaTallaValor
      });

      if (error) {
        mostrarNotificacion("Error al asignar la prenda: " + error.message, "error");
        await cargarDatos();
        return;
      }
      mostrarNotificacion("Prenda asignada correctamente.");
      await cargarDatos();
    }
  };

  // Consolidado por persona
  const estadoPersonalConsolidado = useMemo(() => {
    const mapa = {};

    personal.forEach(p => {
      mapa[p.id] = {
        id: p.id,
        nombre: p.nombre,
        dni: p.dni,
        cargo: p.cargo,
        chaleco: null,
        chalecoTalla: "-",
        polo: null,
        poloTalla: "-",
        gorro: false,
        ultimaFecha: null
      };
    });

    entregas.forEach(e => {
      if (!e.personalId || !mapa[e.personalId]) return;
      const registro = mapa[e.personalId];

      if (!registro.ultimaFecha || new Date(e.fechaRaw) > new Date(registro.ultimaFecha)) {
        registro.ultimaFecha = e.fechaRaw;
      }

      if (e.tipo === "chaleco") {
        registro.chaleco = e.id;
        registro.chalecoTalla = e.talla;
      } else if (e.tipo === "polo") {
        registro.polo = e.id;
        registro.poloTalla = e.talla;
      } else if (e.tipo === "gorro") {
        registro.gorro = true;
      }
    });

    return Object.values(mapa);
  }, [personal, entregas]);

  // Buscador para la pestaña Estado
  const [busquedaEstado, setBusquedaEstado] = useState("");
  const estadoFiltrado = useMemo(() => {
    if (!busquedaEstado.trim()) return estadoPersonalConsolidado;
    const term = busquedaEstado.toLowerCase();
    return estadoPersonalConsolidado.filter(item =>
      item.nombre.toLowerCase().includes(term) ||
      item.dni.includes(term) ||
      item.cargo.toLowerCase().includes(term) ||
      (item.chalecoTalla && item.chalecoTalla.toLowerCase().includes(term)) ||
      (item.poloTalla && item.poloTalla.toLowerCase().includes(term))
    );
  }, [estadoPersonalConsolidado, busquedaEstado]);

  // Nuevos Estados para Filtros Avanzados del Módulo Reportes de Estado
  const [filtroRepoBusqueda, setFiltroRepoBusqueda] = useState("");
  const [filtroRepoCargo, setFiltroRepoCargo] = useState("");
  const [filtroRepoPrenda, setFiltroRepoPrenda] = useState("");
  const [filtroRepoTalla, setFiltroRepoTalla] = useState("");
  const [filtroRepoDesde, setFiltroRepoDesde] = useState("");
  const [filtroRepoHasta, setFiltroRepoHasta] = useState("");

  const reporteEstadoFiltrado = useMemo(() => {
    return estadoPersonalConsolidado.filter(item => {
      // 1. Búsqueda por nombre o DNI
      const coincideBusqueda = 
        !filtroRepoBusqueda ||
        item.nombre.toLowerCase().includes(filtroRepoBusqueda.toLowerCase()) ||
        item.dni.includes(filtroRepoBusqueda);

      // 2. Filtro por Cargo
      const coincideCargo = !filtroRepoCargo || item.cargo === filtroRepoCargo;

      // 3. Filtro por Prenda y Talla
      let coincidePrendaTalla = true;
      if (filtroRepoPrenda === "chaleco") {
        if (!item.chaleco) coincidePrendaTalla = false;
        if (filtroRepoTalla && item.chalecoTalla !== filtroRepoTalla) coincidePrendaTalla = false;
      } else if (filtroRepoPrenda === "polo") {
        if (!item.polo) coincidePrendaTalla = false;
        if (filtroRepoTalla && item.poloTalla !== filtroRepoTalla) coincidePrendaTalla = false;
      } else if (filtroRepoPrenda === "gorro") {
        if (!item.gorro) coincidePrendaTalla = false;
      } else {
        // Si no selecciona tipo de prenda pero sí talla genérica
        if (filtroRepoTalla) {
          const matchChaleco = item.chaleco && item.chalecoTalla === filtroRepoTalla;
          const matchPolo = item.polo && item.poloTalla === filtroRepoTalla;
          if (!matchChaleco && !matchPolo) coincidePrendaTalla = false;
        }
      }

      // 4. Filtro por Fechas (Desde / Hasta basado en última actualización)
      let coincideFecha = true;
      const fechaRegistro = item.ultimaFecha ? new Date(item.ultimaFecha) : null;

      if (filtroRepoDesde && fechaRegistro) {
        const desde = new Date(filtroRepoDesde + "T00:00:00");
        if (fechaRegistro < desde) coincideFecha = false;
      }

      if (filtroRepoHasta && fechaRegistro) {
        const hasta = new Date(filtroRepoHasta + "T23:59:59");
        if (fechaRegistro > hasta) coincideFecha = false;
      }

      return coincideBusqueda && coincideCargo && coincidePrendaTalla && coincideFecha;
    });
  }, [estadoPersonalConsolidado, filtroRepoBusqueda, filtroRepoCargo, filtroRepoPrenda, filtroRepoTalla, filtroRepoDesde, filtroRepoHasta]);

  // Exportar Reporte de Estado a Excel
  const descargarExcelReporteEstado = () => {
    if (reporteEstadoFiltrado.length === 0) {
      alert("No hay datos para exportar con los filtros seleccionados.");
      return;
    }

    const datosFormateados = reporteEstadoFiltrado.map((item, index) => {
      const tieneTodo = item.chaleco && item.polo && item.gorro;
      const noTieneNada = !item.chaleco && !item.polo && !item.gorro;
      const estadoGeneral = noTieneNada ? "Sin Material" : tieneTodo ? "Al Día / Completo" : "Parcial";

      return {
        "N°": index + 1,
        "DNI": item.dni,
        "Nombres y Apellidos": item.nombre,
        "Cargo": item.cargo,
        "Chaleco (Talla)": item.chaleco ? item.chalecoTalla : "No",
        "Polo (Talla)": item.polo ? item.poloTalla : "No",
        "Gorro": item.gorro ? "SÍ" : "No",
        "Estado General": estadoGeneral
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    worksheet["!cols"] = [
      { wch: 6 },  // N°
      { wch: 12 }, // DNI
      { wch: 32 }, // Nombre
      { wch: 24 }, // Cargo
      { wch: 15 }, // Chaleco
      { wch: 15 }, // Polo
      { wch: 10 }, // Gorro
      { wch: 18 }  // Estado General
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estado de Personal");

    const fechaHoy = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Reporte_Estado_Personal_${fechaHoy}.xlsx`);
  };

  // Historial filtrado para pestaña Historial
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const historialFiltrado = useMemo(() => {
    if (!busquedaHistorial.trim()) return entregas;
    const term = busquedaHistorial.toLowerCase();
    return entregas.filter(item =>
      item.persona.toLowerCase().includes(term) ||
      item.dni.includes(term) ||
      item.cargo.toLowerCase().includes(term) ||
      item.tipo.toLowerCase().includes(term) ||
      (item.talla && item.talla.toLowerCase().includes(term))
    );
  }, [entregas, busquedaHistorial]);

  // Estados para inventario de bienes/otros
  const [bienes, setBienes] = useState([]);
  const [nuevoBien, setNuevoBien] = useState({
    nombre_item: "",
    tipo_unidad: "unidades",
    cantidad: 1,
    observacion: "",
    imagen_url: ""
  });

  const cargarBienes = async () => {
    const { data, error } = await supabase
      .from("bienes_recepcionados")
      .select("*")
      .order("fecha", { ascending: false });
    if (!error && data) setBienes(data);
  };

  useEffect(() => {
    if (modulo === "bienes") cargarBienes();
  }, [modulo]);

  const guardarBien = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("bienes_recepcionados").insert([nuevoBien]);
    if (error) {
      mostrarNotificacion("Error al registrar el bien.", "error");
    } else {
      setNuevoBien({ nombre_item: "", tipo_unidad: "unidades", cantidad: 1, observacion: "", imagen_url: "" });
      cargarBienes();
      mostrarNotificacion("Bien registrado correctamente.");
    }
  };

  // Inventario de prendas handler
  const [invProducto, setInvProducto] = useState("chaleco");
  const [invTalla, setInvTalla] = useState("M");
  const [invCantidad, setInvCantidad] = useState(1);

  const agregarStock = async () => {
    const cantidadASumar = Math.max(1, Number(invCantidad) || 0);
    const esGorro = invProducto === "gorro";
    const tallaFinal = esGorro ? null : invTalla;

    let query = supabase.from("inventario").select("*").eq("producto", invProducto);
    if (esGorro) {
      query = query.is("talla", null);
    } else {
      query = query.eq("talla", tallaFinal);
    }

    const { data: existente } = await query.maybeSingle();

    if (existente) {
      await supabase
        .from("inventario")
        .update({ stock: existente.stock + cantidadASumar, actualizado_en: new Date().toISOString() })
        .eq("id", existente.id);
    } else {
      await supabase.from("inventario").insert([{
        producto: invProducto,
        talla: tallaFinal,
        stock: cantidadASumar,
        actualizado_en: new Date().toISOString()
      }]);
    }

    mostrarNotificacion(`Stock actualizado exitosamente (+${cantidadASumar})`);
    setInvCantidad(1);
    await cargarDatos();
  };

  // Carga masiva de personal
  const [textoPersonal, setTextoPersonal] = useState("");
  const [cargoSeleccionado, setCargoSeleccionado] = useState("");
  const [busquedaCargo, setBusquedaCargo] = useState("");

  const procesarPersonal = async () => {
    if (!cargoSeleccionado) {
      mostrarNotificacion("Seleccione un cargo.", "error");
      return;
    }
    const lineas = textoPersonal.trim().split("\n").filter(l => l.trim());
    const nuevos = [];
    for (const linea of lineas) {
      const partes = linea.trim().split(/\s+/);
      const dni = partes.find(i => /^\d{8}$/.test(i));
      const celular = partes.find(i => /^\d{9}$/.test(i));
      const nombre = partes.filter(i => !/^\d{8}$/.test(i) && !/^\d{9}$/.test(i)).join(" ");
      if (nombre && dni) {
        nuevos.push({ nombre, dni, celular: celular || "-", cargo: cargoSeleccionado });
      }
    }
    if (nuevos.length === 0) {
      mostrarNotificacion("No hay registros válidos.", "error");
      return;
    }
    const { error } = await supabase.from("personal").upsert(nuevos, { onConflict: "dni" });
    if (error) {
      mostrarNotificacion(error.message, "error");
      return;
    }
    mostrarNotificacion(`${nuevos.length} personas registradas correctamente.`);
    setTextoPersonal("");
    await cargarDatos();
  };

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

  return (
    <div className="min-h-screen bg-gray-50 relative pb-12">
      {/* Toast Notificación */}
      {notificacion.visible && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
            notificacion.tipo === "exito" ? "bg-emerald-600 text-white border-emerald-500" : "bg-red-600 text-white border-red-500"
          }`}>
            {notificacion.tipo === "exito" ? <CheckCircle2 className="w-6 h-6 text-emerald-200" /> : <AlertCircle className="w-6 h-6 text-red-200" />}
            <p className="font-medium text-sm">{notificacion.mensaje}</p>
            <button onClick={() => setNotificacion(prev => ({ ...prev, visible: false }))} className="ml-auto text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-950 text-white p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 relative">
        <div className="flex items-center justify-center">
          <Image src="/logo.png" alt="Logo INVONPE" width={180} height={180} className="object-contain h-16 md:h-20 w-auto filter drop-shadow-md" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-center tracking-wide">
          CONTROL DE INDUMENTARIA - ONPE
        </h1>
        <div className="hidden md:block w-20"></div>
      </header>

      {/* Navegación */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex gap-3 flex-wrap justify-center">
          <button onClick={() => setModulo("entregas")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "entregas" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Shirt size={18} /> Entregas Múltiples
          </button>
          <button onClick={() => setModulo("estado")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "estado" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Users size={18} /> Estado de Personal
          </button>
          <button onClick={() => setModulo("reportes")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "reportes" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <FileText size={18} /> Reportes de Estado
          </button>
          <button onClick={() => setModulo("historial")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "historial" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <History size={18} /> Historial de Cambios
          </button>
          <button onClick={() => setModulo("inventario")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "inventario" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Package size={18} /> Inventario Prendas
          </button>
          <button onClick={() => setModulo("personal")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "personal" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Users size={18} /> Cargar Personal
          </button>
          <button onClick={() => setModulo("bienes")} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition ${modulo === "bienes" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <FileText size={18} /> Recepción Bienes
          </button>
        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto p-4 mt-4">

        {/* MÓDULO 1: ENTREGAS MULTIPLES */}
        {modulo === "entregas" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Shirt className="text-blue-600" /> Registrar Dotación de Indumentaria
              </h2>
              <p className="text-sm text-gray-500 mb-6">Selecciona una persona y marca las prendas que se le entregarán simultáneamente en esta jornada.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buscar Persona (Nombre o DNI):</label>
                  <input
                    type="text"
                    value={busquedaPersona}
                    onChange={(e) => setBusquedaPersona(e.target.value)}
                    placeholder="Escribe para filtrar..."
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-2"
                  />
                  <select
                    value={personaSeleccionada}
                    onChange={(e) => setPersonaSeleccionada(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800 bg-white"
                  >
                    <option value="">-- Seleccionar Persona --</option>
                    {personasFiltradas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.dni}) - [{p.cargo}]
                      </option>
                    ))}
                  </select>
                </div>

                <hr className="border-gray-100 my-4" />

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">Prendas a Asignar en este Registro:</h3>

                  {/* Chaleco */}
                  <div className={`p-4 rounded-xl border transition-all ${incluirChaleco ? "border-blue-500 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={incluirChaleco}
                          onChange={(e) => IncluirChalecoSet(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        Chaleco
                      </label>
                    </div>
                    {incluirChaleco && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-semibold text-gray-600">Talla:</span>
                        <select
                          value={tallaChaleco}
                          onChange={(e) => setTallaChaleco(e.target.value)}
                          className="border border-gray-300 rounded-lg p-2 text-sm bg-white font-bold outline-none"
                        >
                          {TALLAS.map(t => (
                            <option key={t} value={t}>{t} (Stock: {inventarioChalecos[t]})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Polo */}
                  <div className={`p-4 rounded-xl border transition-all ${incluirPolo ? "border-emerald-500 bg-emerald-50/40" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={incluirPolo}
                          onChange={(e) => incluirPoloSet(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        Polo
                      </label>
                    </div>
                    {incluirPolo && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-semibold text-gray-600">Talla:</span>
                        <select
                          value={tallaPolo}
                          onChange={(e) => setTallaPolo(e.target.value)}
                          className="border border-gray-300 rounded-lg p-2 text-sm bg-white font-bold outline-none"
                        >
                          {TALLAS.map(t => (
                            <option key={t} value={t}>{t} (Stock: {inventarioPolos[t]})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Gorro */}
                  <div className={`p-4 rounded-xl border transition-all ${incluirGorro ? "border-amber-500 bg-amber-50/40" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={incluirGorro}
                          onChange={(e) => incluirGorroSet(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        Gorro (Talla única)
                      </label>
                      <span className="text-xs text-gray-500">Stock disponible: {inventarioGorros}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={registrarEntregaMultiple}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all"
                >
                  Confirmar y Guardar Registro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO 2: ESTADO DE PERSONAL */}
        {modulo === "estado" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Estado Actual de Indumentaria por Persona</h2>
                  <p className="text-xs text-gray-500">Puedes cambiar la talla o marcar "No" directamente desde los selectores de la tabla.</p>
                </div>
                <div className="w-full md:w-80">
                  <input
                    type="text"
                    value={busquedaEstado}
                    onChange={(e) => setBusquedaEstado(e.target.value)}
                    placeholder="Filtrar por nombre, DNI, cargo..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                      <th className="py-3.5 px-4">Colaborador</th>
                      <th className="py-3.5 px-4">DNI</th>
                      <th className="py-3.5 px-4">Cargo</th>
                      <th className="py-3.5 px-4 text-center">Chaleco (Talla / Editar)</th>
                      <th className="py-3.5 px-4 text-center">Polo (Talla / Editar)</th>
                      <th className="py-3.5 px-4 text-center">Gorro</th>
                      <th className="py-3.5 px-4 text-center">Estado General</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {estadoFiltrado.map((item) => {
                      const tieneTodo = item.chaleco && item.polo && item.gorro;
                      const noTieneNada = !item.chaleco && !item.polo && !item.gorro;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{item.nombre}</td>
                          <td className="py-3.5 px-4 font-mono text-xs">{item.dni}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">{item.cargo}</td>
                          
                          <td className="py-3.5 px-4 text-center">
                            <select
                              defaultValue={item.chaleco ? item.chalecoTalla : "NO"}
                              key={`chaleco-${item.id}-${item.chalecoTalla}`}
                              onChange={(e) => handleCambiarPrendaEstado(item.id, "chaleco", item.chalecoTalla, e)}
                              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                                item.chaleco ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-500 border-gray-300"
                              }`}
                            >
                              <option value="NO">No / Sin chaleco</option>
                              {TALLAS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <select
                              defaultValue={item.polo ? item.poloTalla : "NO"}
                              key={`polo-${item.id}-${item.poloTalla}`}
                              onChange={(e) => handleCambiarPrendaEstado(item.id, "polo", item.poloTalla, e)}
                              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                                item.polo ? "bg-blue-50 text-blue-800 border-blue-300" : "bg-gray-100 text-gray-500 border-gray-300"
                              }`}
                            >
                              <option value="NO">No / Sin polo</option>
                              {TALLAS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <select
                              defaultValue={item.gorro ? "SÍ" : "NO"}
                              key={`gorro-${item.id}-${item.gorro}`}
                              onChange={(e) => handleCambiarPrendaEstado(item.id, "gorro", item.gorro ? "SÍ" : "NO", e)}
                              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                                item.gorro ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-500 border-gray-300"
                              }`}
                            >
                              <option value="NO">NO</option>
                              <option value="SÍ">SÍ</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {noTieneNada ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Sin Material</span>
                            ) : tieneTodo ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">Al Día / Completo</span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">Parcial</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {estadoFiltrado.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400">No se encontraron registros en el estado actual.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO 3: REPORTES DE ESTADO DE PERSONAL (CON FILTROS AVANZADOS SOLICITADOS) */}
        {modulo === "reportes" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Filtros de búsqueda avanzada</h2>
              <p className="text-xs text-gray-500">Busca y filtra el estado del personal según los parámetros requeridos.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
                {/* 1. Buscar Persona / DNI */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Buscar Persona / DNI</label>
                  <input
                    type="text"
                    value={filtroRepoBusqueda}
                    onChange={(e) => setFiltroRepoBusqueda(e.target.value)}
                    placeholder="Nombre o DNI..."
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 2. Cargo */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cargo</label>
                  <select
                    value={filtroRepoCargo}
                    onChange={(e) => setFiltroRepoCargo(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Todos los cargos</option>
                    {CARGOS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Prenda */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Prenda</label>
                  <select
                    value={filtroRepoPrenda}
                    onChange={(e) => setFiltroRepoPrenda(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Todas</option>
                    <option value="chaleco">Chaleco</option>
                    <option value="polo">Polo</option>
                    <option value="gorro">Gorro</option>
                  </select>
                </div>

                {/* 4. Talla */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Talla</label>
                  <select
                    value={filtroRepoTalla}
                    onChange={(e) => setFiltroRepoTalla(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Todas las tallas</option>
                    {TALLAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Desde */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={filtroRepoDesde}
                    onChange={(e) => setFiltroRepoDesde(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 6. Hasta */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filtroRepoHasta}
                    onChange={(e) => setFiltroRepoHasta(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {(filtroRepoBusqueda || filtroRepoCargo || filtroRepoPrenda || filtroRepoTalla || filtroRepoDesde || filtroRepoHasta) && (
                <button
                  onClick={() => {
                    setFiltroRepoBusqueda("");
                    setFiltroRepoCargo("");
                    setFiltroRepoPrenda("");
                    setFiltroRepoTalla("");
                    setFiltroRepoDesde("");
                    setFiltroRepoHasta("");
                  }}
                  className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 underline"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Resultados ({reporteEstadoFiltrado.length})</h3>
                <button
                  onClick={descargarExcelReporteEstado}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-md flex items-center gap-2"
                >
                  Exportar a Excel (.xlsx)
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4">DNI</th>
                      <th className="py-3.5 px-4">Colaborador</th>
                      <th className="py-3.5 px-4">Cargo</th>
                      <th className="py-3.5 px-4 text-center">Chaleco</th>
                      <th className="py-3.5 px-4 text-center">Polo</th>
                      <th className="py-3.5 px-4 text-center">Gorro</th>
                      <th className="py-3.5 px-4 text-center">Estado General</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {reporteEstadoFiltrado.map((item) => {
                      const tieneTodo = item.chaleco && item.polo && item.gorro;
                      const noTieneNada = !item.chaleco && !item.polo && !item.gorro;

                      return (
                        <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs">{item.dni}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{item.nombre}</td>
                          <td className="py-3 px-4 text-xs text-gray-500 font-semibold">{item.cargo}</td>
                          <td className="py-3 px-4 text-center font-bold">{item.chaleco ? item.chalecoTalla : "No"}</td>
                          <td className="py-3 px-4 text-center font-bold">{item.polo ? item.poloTalla : "No"}</td>
                          <td className="py-3 px-4 text-center font-bold">{item.gorro ? "SÍ" : "No"}</td>
                          <td className="py-3 px-4 text-center">
                            {noTieneNada ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">Sin Material</span>
                            ) : tieneTodo ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">Al Día / Completo</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">Parcial</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {reporteEstadoFiltrado.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-400 font-medium">No se encontraron registros para los filtros seleccionados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO 4: HISTORIAL DETALLADO */}
        {modulo === "historial" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Historial de Cambios y Entregas</h2>
                  <p className="text-xs text-gray-500">Registro cronológico detallado de cada prenda entregada o modificada.</p>
                </div>
                <div className="w-full md:w-80">
                  <input
                    type="text"
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    placeholder="Buscar en el historial..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                      <th className="py-3.5 px-4">Fecha y Hora</th>
                      <th className="py-3.5 px-4">Colaborador</th>
                      <th className="py-3.5 px-4">DNI</th>
                      <th className="py-3.5 px-4">Cargo</th>
                      <th className="py-3.5 px-4">Prenda</th>
                      <th className="py-3.5 px-4 text-center">Talla</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {historialFiltrado.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-500">{item.fecha}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{item.persona}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">{item.dni}</td>
                        <td className="py-3.5 px-4 text-xs text-gray-500">{item.cargo}</td>
                        <td className="py-3.5 px-4 capitalize font-semibold">{item.tipo}</td>
                        <td className="py-3.5 px-4 text-center font-bold">{item.talla || "Única"}</td>
                      </tr>
                    ))}
                    {historialFiltrado.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">No hay registros en el historial.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO 5: INVENTARIO */}
        {modulo === "inventario" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Inventario de Prendas</h2>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold mb-2">Registrar ingreso de nuevo stock</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenda:</label>
                  <select
                    value={invProducto}
                    onChange={(e) => setInvProducto(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="chaleco">Chaleco</option>
                    <option value="polo">Polo</option>
                    <option value="gorro">Gorro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla:</label>
                  {invProducto === "gorro" ? (
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm text-gray-500 font-medium">Talla Única</div>
                  ) : (
                    <select
                      value={invTalla}
                      onChange={(e) => setInvTalla(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 outline-none bg-white text-sm"
                    >
                      {TALLAS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={invCantidad}
                    onChange={(e) => setInvCantidad(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <button
                  onClick={agregarStock}
                  className="bg-blue-600 text-white font-medium p-2.5 rounded-xl hover:bg-blue-700 transition shadow text-sm"
                >
                  Sumar al Stock
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Chalecos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-blue-50 rounded-xl text-center">
                      <span className="block font-bold text-gray-600 text-xs">{talla}</span>
                      <span className="text-xl font-black text-blue-700">{inventarioChalecos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Polos
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {TALLAS.map(talla => (
                    <div key={talla} className="p-3 bg-emerald-50 rounded-xl text-center">
                      <span className="block font-bold text-gray-600 text-xs">{talla}</span>
                      <span className="text-xl font-black text-emerald-700">{inventarioPolos[talla]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-500 rounded-full"></span> Gorros
                </h3>
                <div className="p-6 bg-amber-50 rounded-xl text-center flex flex-col justify-center items-center h-32">
                  <span className="block font-bold text-gray-600 text-xs">Talla Única</span>
                  <span className="text-3xl font-black text-amber-700 mt-1">{inventarioGorros}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MÓDULO 6: PERSONAL */}
        {modulo === "personal" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Carga Masiva de Personal</h2>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Cargo para el Lote:</label>
                <input
                  type="text"
                  value={busquedaCargo}
                  onChange={(e) => setBusquedaCargo(e.target.value)}
                  placeholder="Buscar cargo..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 mb-2 focus:border-blue-500 outline-none text-sm"
                />
                <select
                  value={cargoSeleccionado}
                  onChange={(e) => setCargoSeleccionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 outline-none bg-white text-sm"
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
                placeholder="Pega aquí la lista (Ejemplo: JUAN PEREZ 20017031 949631751)"
                className="w-full h-40 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:border-blue-500 outline-none"
              />

              <button
                onClick={procesarPersonal}
                className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow text-sm font-semibold"
              >
                Procesar y Guardar Personal
              </button>
            </div>
          </div>
        )}

        {/* MÓDULO 7: BIENES */}
        {modulo === "bienes" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Registrar Recepción de Bienes / Materiales</h2>
              <form onSubmit={guardarBien} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción / Item</label>
                  <input
                    type="text"
                    placeholder="Ej. Cajas de ánforas, Sillas..."
                    value={nuevoBien.nombre_item}
                    onChange={(e) => setNuevoBien({ ...nuevoBien, nombre_item: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Presentación</label>
                  <select
                    value={nuevoBien.tipo_unidad}
                    onChange={(e) => setNuevoBien({ ...nuevoBien, tipo_unidad: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="cajas">Cajas</option>
                    <option value="paquetes">Paquetes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={nuevoBien.cantidad}
                    onChange={(e) => setNuevoBien({ ...nuevoBien, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Observaciones</label>
                  <input
                    type="text"
                    placeholder="Detalles de recepción..."
                    value={nuevoBien.observacion}
                    onChange={(e) => setNuevoBien({ ...nuevoBien, observacion: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition">
                    Guardar Recepción
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}