import { useState, useRef, useCallback, useEffect } from "react";

const TATAMI_M2 = 1.62;

const PRESET_FURNITURE = [
  { name: "ベッド (シングル)", w: 100, h: 200, color: "#5B8C5A" },
  { name: "ベッド (セミ)", w: 120, h: 200, color: "#5B8C5A" },
  { name: "デスク", w: 70, h: 140, color: "#8B6F47" },
  { name: "チェア", w: 66, h: 100, color: "#A0522D" },
  { name: "ソファ", w: 180, h: 80, color: "#7A6B8E" },
  { name: "テーブル", w: 80, h: 80, color: "#B8860B" },
  { name: "本棚", w: 90, h: 30, color: "#6B4226" },
  { name: "クローゼット", w: 120, h: 60, color: "#4A6670" },
  { name: "冷蔵庫", w: 60, h: 70, color: "#708090" },
  { name: "洗濯機", w: 60, h: 60, color: "#A0AEC0" },
  { name: "テレビ台", w: 150, h: 40, color: "#2D3748" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function RoomPlanner() {
  const [roomWStr, setRoomWStr] = useState("360");
  const [roomHStr, setRoomHStr] = useState("360");
  const roomW = Math.max(1, Number(roomWStr) || 1);
  const roomH = Math.max(1, Number(roomHStr) || 1);
  const [furniture, setFurniture] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [roomRotation, setRoomRotation] = useState(0);

  // custom furniture form
  const [customName, setCustomName] = useState("");
  const [customW, setCustomW] = useState(80);
  const [customH, setCustomH] = useState(80);
  const [customColor, setCustomColor] = useState("#E07A5F");

  // drag state
  const [dragging, setDragging] = useState(null);
  const canvasRef = useRef(null);
  const roomAreaRef = useRef(null);
  const bgFileRef = useRef(null);

  // background image state
  const [bgImage, setBgImage] = useState(null);
  const [bgNaturalW, setBgNaturalW] = useState(0);
  const [bgNaturalH, setBgNaturalH] = useState(0);
  const [bgScale, setBgScale] = useState(100); // percentage

  const loadBgImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setBgNaturalW(img.width);
        setBgNaturalH(img.height);
        setBgImage(ev.target.result);
        setBgScale(100);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Paste handler for background image
  useEffect(() => {
    const handler = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          loadBgImage(item.getAsFile());
          return;
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, []);

  const sqm = ((roomW * roomH) / 10000).toFixed(2);
  const tatami = ((roomW * roomH) / 10000 / TATAMI_M2).toFixed(1);

  // Scale: fit the room into the canvas
  const CANVAS_SIZE = 560;
  const PADDING = 30;
  const maxDim = Math.max(roomW, roomH);
  const scale = maxDim > 0 ? (CANVAS_SIZE - PADDING * 2) / maxDim : 1;

  const scaledRoomW = roomW * scale;
  const scaledRoomH = roomH * scale;
  const roomOffsetX = (CANVAS_SIZE - scaledRoomW) / 2;
  const roomOffsetY = (CANVAS_SIZE - scaledRoomH) / 2;

  const addPreset = (preset) => {
    setFurniture((prev) => [
      ...prev,
      {
        id: uid(),
        name: preset.name,
        w: preset.w,
        h: preset.h,
        color: preset.color,
        x: roomW / 2 - preset.w / 2,
        y: roomH / 2 - preset.h / 2,
        rotation: 0,
      },
    ]);
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    setFurniture((prev) => [
      ...prev,
      {
        id: uid(),
        name: customName,
        w: customW,
        h: customH,
        color: customColor,
        x: roomW / 2 - customW / 2,
        y: roomH / 2 - customH / 2,
        rotation: 0,
      },
    ]);
    setCustomName("");
  };

  const rotateFurniture = (id) => {
    setFurniture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f))
    );
  };

  const deleteFurniture = (id) => {
    setFurniture((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleMouseDown = useCallback(
    (e, id) => {
      e.stopPropagation();
      setSelectedId(id);
      const rect = roomAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const item = furniture.find((f) => f.id === id);
      if (!item) return;

      // account for room rotation
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = (-roomRotation * Math.PI) / 180;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const localX = rotX + scaledRoomW / 2;
      const localY = rotY + scaledRoomH / 2;

      setDragging({
        id,
        offsetX: localX / scale - item.x,
        offsetY: localY / scale - item.y,
      });
    },
    [furniture, scale, roomRotation, scaledRoomW, scaledRoomH]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging) return;
      const rect = roomAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = (-roomRotation * Math.PI) / 180;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const localX = rotX + scaledRoomW / 2;
      const localY = rotY + scaledRoomH / 2;

      const newX = localX / scale - dragging.offsetX;
      const newY = localY / scale - dragging.offsetY;

      setFurniture((prev) =>
        prev.map((f) =>
          f.id === dragging.id
            ? { ...f, x: Math.round(newX), y: Math.round(newY) }
            : f
        )
      );
    },
    [dragging, scale, roomRotation, scaledRoomW, scaledRoomH]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback(
    (e, id) => {
      e.stopPropagation();
      setSelectedId(id);
      const touch = e.touches[0];
      const rect = roomAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const item = furniture.find((f) => f.id === id);
      if (!item) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = (-roomRotation * Math.PI) / 180;
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const localX = rotX + scaledRoomW / 2;
      const localY = rotY + scaledRoomH / 2;

      setDragging({
        id,
        offsetX: localX / scale - item.x,
        offsetY: localY / scale - item.y,
      });
    },
    [furniture, scale, roomRotation, scaledRoomW, scaledRoomH]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!dragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = roomAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = (-roomRotation * Math.PI) / 180;
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const localX = rotX + scaledRoomW / 2;
      const localY = rotY + scaledRoomH / 2;

      const newX = localX / scale - dragging.offsetX;
      const newY = localY / scale - dragging.offsetY;

      setFurniture((prev) =>
        prev.map((f) =>
          f.id === dragging.id
            ? { ...f, x: Math.round(newX), y: Math.round(newY) }
            : f
        )
      );
    },
    [dragging, scale, roomRotation, scaledRoomW, scaledRoomH]
  );

  useEffect(() => {
    if (dragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [dragging, handleTouchMove, handleMouseUp]);

  const gridSpacingCm = maxDim > 600 ? 100 : 50;
  const gridSpacingPx = gridSpacingCm * scale;

  const selectedItem = furniture.find((f) => f.id === selectedId);

  return (
    <div style={{
      height: "100vh",
      background: "#0B1120",
      color: "#C5D0E6",
      fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        padding: "16px 28px",
        borderBottom: "1px solid #1E2A42",
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#0D1424",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, #3B82F6, #6366F1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#fff",
        }}>間</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#E8ECF4", fontFamily: "'DM Sans', sans-serif" }}>
            間取りプランナー
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#6B7A99", letterSpacing: "0.05em" }}>ROOM LAYOUT SIMULATOR</p>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar */}
        <aside style={{
          width: 300, minWidth: 300,
          background: "#0D1424",
          borderRight: "1px solid #1E2A42",
          overflowY: "auto",
          padding: "0",
        }}>
          {/* Room Size */}
          <div style={{ padding: "20px 20px 16px" }}>
            <SectionTitle>部屋のサイズ</SectionTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <InputField label="幅 (cm)" value={roomWStr} onChange={(v) => setRoomWStr(v)} />
              <InputField label="奥行 (cm)" value={roomHStr} onChange={(v) => setRoomHStr(v)} />
            </div>
            <div style={{
              display: "flex", gap: 8, marginTop: 8,
            }}>
              <StatBadge label="m²" value={sqm} />
              <StatBadge label="畳" value={tatami} />
            </div>
          </div>

          <Divider />

          {/* Room Rotation */}
          <div style={{ padding: "16px 20px" }}>
            <SectionTitle>部屋の回転</SectionTitle>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRoomRotation(deg)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 6,
                    border: roomRotation === deg ? "1.5px solid #3B82F6" : "1px solid #1E2A42",
                    background: roomRotation === deg ? "#1A2744" : "#111B2E",
                    color: roomRotation === deg ? "#60A5FA" : "#6B7A99",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Background Image */}
          <div style={{ padding: "16px 20px" }}>
            <SectionTitle>背景画像 (間取り図)</SectionTitle>
            <p style={{ fontSize: 11, color: "#6B7A99", marginBottom: 10, lineHeight: 1.5 }}>
              画像をペーストするか、ファイルを選択してください
            </p>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) loadBgImage(e.target.files[0]);
              }}
            />
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button
                onClick={() => bgFileRef.current?.click()}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 6,
                  border: "1px solid #1E2A42", background: "#111B2E",
                  color: "#C5D0E6", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
                }}
              >
                📁 ファイル選択
              </button>
              {bgImage && (
                <button
                  onClick={() => { setBgImage(null); setBgScale(100); }}
                  style={{
                    padding: "8px 12px", borderRadius: 6,
                    border: "1px solid #7F1D1D", background: "#111B2E",
                    color: "#FCA5A5", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {bgImage && (
              <div>
                <label style={{ fontSize: 10, color: "#6B7A99", display: "block", marginBottom: 4 }}>
                  サイズ: {bgScale}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={300}
                  value={bgScale}
                  onChange={(e) => setBgScale(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#3B82F6" }}
                />
              </div>
            )}
          </div>

          <Divider />

          {/* Preset Furniture */}
          <div style={{ padding: "16px 20px" }}>
            <SectionTitle>定番家具を追加</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_FURNITURE.map((p, i) => (
                <button
                  key={i}
                  onClick={() => addPreset(p)}
                  style={{
                    padding: "5px 10px", borderRadius: 6,
                    border: "1px solid #1E2A42",
                    background: "#111B2E",
                    color: "#C5D0E6", fontSize: 11,
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                  onMouseEnter={(e) => { e.target.style.background = "#1A2744"; e.target.style.borderColor = "#3B82F6"; }}
                  onMouseLeave={(e) => { e.target.style.background = "#111B2E"; e.target.style.borderColor = "#1E2A42"; }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Custom Furniture */}
          <div style={{ padding: "16px 20px" }}>
            <SectionTitle>カスタム家具を追加</SectionTitle>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="家具の名前"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "8px 10px", borderRadius: 6,
                  border: "1px solid #1E2A42", background: "#111B2E",
                  color: "#E8ECF4", fontSize: 13, outline: "none",
                  fontFamily: "'Noto Sans JP', sans-serif",
                }}
                onFocus={(e) => e.target.style.borderColor = "#3B82F6"}
                onBlur={(e) => e.target.style.borderColor = "#1E2A42"}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <InputField label="幅 (cm)" value={customW} onChange={(v) => setCustomW(Number(v) || 0)} />
              <InputField label="奥行 (cm)" value={customH} onChange={(v) => setCustomH(Number(v) || 0)} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#6B7A99" }}>色:</label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                style={{
                  width: 36, height: 28, border: "1px solid #1E2A42",
                  borderRadius: 6, background: "none", cursor: "pointer", padding: 1,
                }}
              />
              <span style={{ fontSize: 11, color: "#6B7A99", fontFamily: "'DM Mono', monospace" }}>{customColor}</span>
            </div>
            <button
              onClick={addCustom}
              style={{
                width: "100%", padding: "9px 0", borderRadius: 6,
                border: "none",
                background: "linear-gradient(135deg, #3B82F6, #6366F1)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              ＋ 追加
            </button>
          </div>

          <Divider />

          {/* Selected Furniture Info */}
          {selectedItem && (
            <div style={{ padding: "16px 20px" }}>
              <SectionTitle>選択中: {selectedItem.name}</SectionTitle>
              <div style={{
                fontSize: 12, color: "#6B7A99", marginBottom: 10,
                fontFamily: "'DM Mono', monospace",
              }}>
                {selectedItem.w}×{selectedItem.h}cm ・ 位置({selectedItem.x}, {selectedItem.y}) ・ {selectedItem.rotation}°
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => rotateFurniture(selectedItem.id)} style={actionBtnStyle}>
                  ↻ 回転
                </button>
                <button onClick={() => deleteFurniture(selectedItem.id)} style={{ ...actionBtnStyle, borderColor: "#7F1D1D", color: "#FCA5A5" }}>
                  ✕ 削除
                </button>
              </div>
            </div>
          )}

          {/* Furniture List */}
          {furniture.length > 0 && (
            <div style={{ padding: "16px 20px" }}>
              <SectionTitle>配置済み家具 ({furniture.length})</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {furniture.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    style={{
                      padding: "7px 10px", borderRadius: 6,
                      background: selectedId === f.id ? "#1A2744" : "transparent",
                      border: selectedId === f.id ? "1px solid #3B82F680" : "1px solid transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ fontSize: 10, color: "#6B7A99", fontFamily: "'DM Mono', monospace" }}>
                      {f.w}×{f.h}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ height: 20, flexShrink: 0 }} />
        </aside>

        {/* Canvas Area */}
        <main
          ref={canvasRef}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0B1120",
            position: "relative",
            overflow: "hidden",
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* Blueprint dot pattern */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, #1A2744 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.5,
          }} />

          {/* Room container with rotation */}
          <div
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              position: "relative",
              transform: `rotate(${roomRotation}deg)`,
              transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Room rect */}
            <div
              ref={roomAreaRef}
              style={{
                position: "absolute",
                left: roomOffsetX,
                top: roomOffsetY,
                width: scaledRoomW,
                height: scaledRoomH,
                background: "#111B2E",
                border: "2px solid #3B82F6",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {/* Background image */}
              {bgImage && bgNaturalW > 0 && (
                <img
                  src={bgImage}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: scaledRoomW * (bgScale / 100),
                    height: scaledRoomW * (bgScale / 100) * (bgNaturalH / bgNaturalW),
                    opacity: 0.4,
                    pointerEvents: "none",
                    objectFit: "contain",
                    zIndex: 1,
                  }}
                />
              )}
              {/* Grid */}
              <svg
                width={scaledRoomW}
                height={scaledRoomH}
                style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}
              >
                {Array.from({ length: Math.floor(roomW / gridSpacingCm) + 1 }, (_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * gridSpacingPx}
                    y1={0}
                    x2={i * gridSpacingPx}
                    y2={scaledRoomH}
                    stroke="#1E2A42"
                    strokeWidth={1}
                    strokeDasharray={i === 0 ? "none" : "2 4"}
                  />
                ))}
                {Array.from({ length: Math.floor(roomH / gridSpacingCm) + 1 }, (_, i) => (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={i * gridSpacingPx}
                    x2={scaledRoomW}
                    y2={i * gridSpacingPx}
                    stroke="#1E2A42"
                    strokeWidth={1}
                    strokeDasharray={i === 0 ? "none" : "2 4"}
                  />
                ))}
              </svg>

              {/* Dimension labels */}
              <div style={{
                position: "absolute", bottom: -22, left: "50%", transform: `translateX(-50%) rotate(${-roomRotation}deg)`,
                fontSize: 11, color: "#3B82F6", fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap",
              }}>
                {roomW} cm
              </div>
              <div style={{
                position: "absolute", right: -42, top: "50%", transform: `translateY(-50%) rotate(${-roomRotation}deg)`,
                fontSize: 11, color: "#3B82F6", fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap",
              }}>
                {roomH} cm
              </div>

              {/* Furniture items */}
              {furniture.map((f) => {
                const fw = f.w * scale;
                const fh = f.h * scale;
                const isSelected = selectedId === f.id;
                return (
                  <div
                    key={f.id}
                    onMouseDown={(e) => handleMouseDown(e, f.id)}
                    onTouchStart={(e) => handleTouchStart(e, f.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(f.id); }}
                    style={{
                      position: "absolute",
                      left: f.x * scale,
                      top: f.y * scale,
                      width: fw,
                      height: fh,
                      transform: `rotate(${f.rotation}deg)`,
                      transformOrigin: "center center",
                      background: f.color + "CC",
                      border: isSelected ? "2px solid #FCD34D" : "1.5px solid " + f.color,
                      borderRadius: 3,
                      cursor: dragging?.id === f.id ? "grabbing" : "grab",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                      zIndex: isSelected ? 20 : 10,
                      boxShadow: isSelected ? "0 0 12px #FCD34D44" : "0 2px 8px #00000040",
                      transition: dragging?.id === f.id ? "none" : "box-shadow 0.2s",
                    }}
                  >
                    <span style={{
                      fontSize: Math.min(fw, fh) < 40 ? 8 : 10,
                      color: "#fff",
                      textAlign: "center",
                      lineHeight: 1.2,
                      padding: 2,
                      textShadow: "0 1px 3px #00000080",
                      overflow: "hidden",
                      fontWeight: 600,
                      transform: `rotate(${-f.rotation}deg)`,
                      maxWidth: "90%",
                      pointerEvents: "none",
                    }}>
                      {f.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room info overlay */}
          <div style={{
            position: "absolute", bottom: 20, left: 20,
            background: "#0D1424E0",
            border: "1px solid #1E2A42",
            borderRadius: 8, padding: "10px 16px",
            fontSize: 12, fontFamily: "'DM Mono', monospace",
            color: "#6B7A99",
            backdropFilter: "blur(8px)",
          }}>
            {roomW}×{roomH}cm ・ {sqm}m² ・ {tatami}畳 ・ 回転 {roomRotation}°
          </div>

          {/* Instructions overlay */}
          {furniture.length === 0 && (
            <div style={{
              position: "absolute", top: 20, right: 20,
              background: "#0D1424CC",
              border: "1px solid #1E2A42",
              borderRadius: 8, padding: "12px 18px",
              fontSize: 12, color: "#6B7A99",
              maxWidth: 220, lineHeight: 1.6,
              backdropFilter: "blur(8px)",
            }}>
              左のパネルから家具を追加し、ドラッグで配置してください。家具をクリックして選択・回転・削除ができます。
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{
      margin: "0 0 10px", fontSize: 12, fontWeight: 700,
      color: "#8899B8", textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
    }}>
      {children}
    </h3>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 10, color: "#6B7A99", display: "block", marginBottom: 3 }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "7px 8px", borderRadius: 6,
          border: "1px solid #1E2A42", background: "#111B2E",
          color: "#E8ECF4", fontSize: 13, outline: "none",
          fontFamily: "'DM Mono', monospace",
        }}
        onFocus={(e) => e.target.style.borderColor = "#3B82F6"}
        onBlur={(e) => e.target.style.borderColor = "#1E2A42"}
      />
    </div>
  );
}

function StatBadge({ label, value }) {
  return (
    <div style={{
      flex: 1, padding: "8px 10px", borderRadius: 6,
      background: "#111B2E", border: "1px solid #1E2A42",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#E8ECF4", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6B7A99", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#1E2A42", margin: "0" }} />;
}

const actionBtnStyle = {
  flex: 1, padding: "8px 0", borderRadius: 6,
  border: "1px solid #1E2A42", background: "#111B2E",
  color: "#C5D0E6", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
  transition: "all 0.15s",
};
