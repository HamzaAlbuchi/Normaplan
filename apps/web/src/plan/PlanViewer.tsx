/**
 * Lightweight plan visualization using Three.js.
 * Renders a simplified 2D/3D representation of extracted plan elements.
 * Highlights violations, supports click-to-zoom and hover tooltips.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  buildPlanLayout,
  WALL_HEIGHT,
  type PlanLayout,
  type RoomLayout,
  type DoorLayout,
  type WindowLayout,
  type CorridorLayout,
} from "./planLayout";

export interface ViolationLike {
  elementIds: string[];
  message?: string;
  ruleName?: string;
  severity?: string;
}

export interface PlanViewerProps {
  /** Plan elements from extraction JSON */
  elements: {
    rooms?: Array<{ id: string; name?: string; areaM2: number }>;
    corridors?: Array<{ id: string; widthM: number; lengthM?: number }>;
    doors?: Array<{ id: string; widthM: number; roomIds?: string[] }>;
    windows?: Array<{ id: string; areaM2: number; roomId: string }>;
  };
  /** Violations to highlight (elementIds used for matching) */
  violations?: ViolationLike[];
  /** Callback when user clicks a violation (e.g. scroll to finding) */
  onViolationClick?: (elementId: string) => void;
  /** Optional: initial camera distance */
  height?: number;
  width?: number;
  /** Optional: 2D top-down only (no walls) */
  topDownOnly?: boolean;
}

const ROOM_COLOR = 0xd1d5db;
const ROOM_VIOLATION_COLOR = 0xfecaca;
const WALL_COLOR = 0x94a3b8;
const DOOR_COLOR = 0x64748b;
const DOOR_VIOLATION_COLOR = 0xef4444;
const WINDOW_COLOR = 0x38bdf8;
const WINDOW_VIOLATION_COLOR = 0xf59e0b;
const CORRIDOR_COLOR = 0x9ca3af;

function getViolatedIds(violations: ViolationLike[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const v of violations ?? []) {
    for (const id of v.elementIds ?? []) set.add(id);
  }
  return set;
}

function getFindingsByElement(violations: ViolationLike[] | undefined): Map<string, ViolationLike[]> {
  const map = new Map<string, ViolationLike[]>();
  for (const v of violations ?? []) {
    for (const id of v.elementIds ?? []) {
      const list = map.get(id) ?? [];
      list.push(v);
      map.set(id, list);
    }
  }
  return map;
}

export function PlanViewer({
  elements,
  violations = [],
  onViolationClick,
  height = 320,
  width = 480,
  topDownOnly = false,
}: PlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesByElementRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [hoveredElement, setHoveredElement] = useState<{
    id: string;
    type: string;
    findings: ViolationLike[];
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const violatedIds = getViolatedIds(violations);
  const findingsByElement = getFindingsByElement(violations);
  const violatedIdsKey = Array.from(violatedIds).sort().join(",");

  const layoutRef = useRef<PlanLayout | null>(null);

  const zoomToElement = useCallback(
    (elementId: string) => {
      const obj = meshesByElementRef.current.get(elementId);
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!obj || !camera || !scene) return;

      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 2);

      camera.position.set(center.x + maxDim * 0.6, center.y + maxDim * 0.6, center.z + maxDim);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      onViolationClick?.(elementId);
    },
    [onViolationClick]
  );

  useEffect(() => {
    if (!containerRef.current || !elements?.rooms?.length) return;

    const layout = buildPlanLayout(elements);
    layoutRef.current = layout;

    const { bounds } = layout;
    const pad = 3;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = -(bounds.minY + bounds.maxY) / 2;
    const camera = new THREE.OrthographicCamera(
      bounds.minX - pad,
      bounds.maxX + pad,
      -bounds.minY + pad,
      -bounds.maxY - pad,
      0.1,
      1000
    );
    camera.position.set(centerX, 25, centerZ);
    camera.lookAt(centerX, 0, centerZ);
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const meshesByElement = meshesByElementRef.current;
    meshesByElement.clear();

    const shapeToGeometry = (shape: THREE.Shape) =>
      new THREE.ShapeGeometry(shape);

    const addRoom = (r: RoomLayout, isViolated: boolean) => {
      const shape = new THREE.Shape();
      shape.moveTo(r.x, r.y);
      shape.lineTo(r.x + r.width, r.y);
      shape.lineTo(r.x + r.width, r.y + r.depth);
      shape.lineTo(r.x, r.y + r.depth);
      shape.closePath();

      const geom = shapeToGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color: isViolated ? ROOM_VIOLATION_COLOR : ROOM_COLOR,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.01;
      mesh.userData = { elementId: r.id, type: "room" };
      scene.add(mesh);
      meshesByElement.set(r.id, mesh);

      const edgeGeom = new THREE.EdgesGeometry(geom);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isViolated ? 0xdc2626 : 0x64748b,
        linewidth: 1,
      });
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      edges.rotation.x = -Math.PI / 2;
      edges.position.y = -0.005;
      scene.add(edges);

      if (!topDownOnly) {
        const wallGeom = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(r.width, WALL_HEIGHT, r.depth)
        );
        const wallMat = new THREE.LineBasicMaterial({
          color: isViolated ? 0xdc2626 : WALL_COLOR,
          linewidth: 1,
        });
        const wallLines = new THREE.LineSegments(wallGeom, wallMat);
        wallLines.position.set(r.x + r.width / 2, WALL_HEIGHT / 2, -(r.y + r.depth / 2));
        wallLines.userData = { elementId: r.id, type: "room" };
        scene.add(wallLines);
      }
    };

    const addCorridor = (c: CorridorLayout) => {
      const shape = new THREE.Shape();
      shape.moveTo(c.x, c.y);
      shape.lineTo(c.x + c.length, c.y);
      shape.lineTo(c.x + c.length, c.y + c.width);
      shape.lineTo(c.x, c.y + c.width);
      shape.closePath();
      const geom = shapeToGeometry(shape);
      const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({ color: CORRIDOR_COLOR, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.02;
      scene.add(mesh);
    };

    const addDoor = (d: DoorLayout, isViolated: boolean) => {
      const geom = new THREE.PlaneGeometry(d.width, d.depth);
      const mat = new THREE.MeshBasicMaterial({
        color: isViolated ? DOOR_VIOLATION_COLOR : DOOR_COLOR,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(d.x + d.width / 2, 0.02, -(d.y + d.depth / 2));
      mesh.userData = { elementId: d.id, type: "door" };
      scene.add(mesh);
      meshesByElement.set(d.id, mesh);
    };

    const addWindow = (w: WindowLayout, isViolated: boolean) => {
      const geom = new THREE.PlaneGeometry(w.width, w.depth);
      const mat = new THREE.MeshBasicMaterial({
        color: isViolated ? WINDOW_VIOLATION_COLOR : WINDOW_COLOR,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(w.x + w.width / 2, 0.03, w.y + w.depth / 2);
      mesh.userData = { elementId: w.id, type: "window" };
      scene.add(mesh);
      meshesByElement.set(w.id, mesh);
    };

    layout.corridors.forEach(addCorridor);
    layout.rooms.forEach((r) => addRoom(r, violatedIds.has(r.id)));
    layout.doors.forEach((d) => addDoor(d, violatedIds.has(d.id)));
    layout.windows.forEach((w) => addWindow(w, violatedIds.has(w.id)));

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [elements, violatedIdsKey, topDownOnly, width, height]);

  useEffect(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    if (!container || !renderer) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / height) * 2 + 1;
      setTooltipPos({ x: e.clientX, y: e.clientY });

      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!camera || !scene) return;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes = scene.children.filter(
        (c) => c instanceof THREE.Mesh && c.userData?.elementId
      ) as THREE.Mesh[];
      const hits = raycasterRef.current.intersectObjects(meshes);

      if (hits.length > 0) {
        const hit = hits[0]!;
        const id = (hit.object as THREE.Mesh & { userData: { elementId: string; type: string } })
          .userData.elementId;
        const type = (hit.object as THREE.Mesh & { userData: { type: string } }).userData.type;
        const findings = findingsByElement.get(id) ?? [];
        setHoveredElement({ id, type, findings });
      } else {
        setHoveredElement(null);
      }
    };

    const onPointerLeave = () => {
      setHoveredElement(null);
      setTooltipPos(null);
    };

    const onClick = () => {
      if (hoveredElement && hoveredElement.findings.length > 0) {
        zoomToElement(hoveredElement.id);
      }
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("click", onClick);

    return () => {
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("click", onClick);
    };
  }, [findingsByElement, zoomToElement, width, height]);

  const hasElements =
    (elements?.rooms?.length ?? 0) > 0 ||
    (elements?.corridors?.length ?? 0) > 0 ||
    (elements?.doors?.length ?? 0) > 0;

  if (!hasElements) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
        style={{ width, height }}
      >
        <span className="text-sm">Keine Plan-Elemente zur Darstellung</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="rounded-lg border border-slate-200 overflow-hidden cursor-crosshair"
        style={{ width, height }}
      />
      {hoveredElement && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm max-w-xs"
          style={{
            left: Math.min(tooltipPos.x + 12, window.innerWidth - 220),
            top: Math.min(tooltipPos.y + 12, window.innerHeight - 120),
          }}
        >
          <p className="font-medium text-slate-800">
            {hoveredElement.type === "room" ? "Raum" : hoveredElement.type === "door" ? "Tür" : "Fenster"}:{" "}
            {hoveredElement.id}
          </p>
          {hoveredElement.findings.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-slate-600">
              {hoveredElement.findings.slice(0, 3).map((f, i) => (
                <li key={i} className="text-xs">
                  {f.ruleName ?? f.message?.slice(0, 60)}
                </li>
              ))}
              {hoveredElement.findings.length > 3 && (
                <li className="text-xs text-slate-400">+{hoveredElement.findings.length - 3} weitere</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
