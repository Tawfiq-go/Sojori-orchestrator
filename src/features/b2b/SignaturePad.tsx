// ════════════════════════════════════════════════════════════════════════════
// Pavé de signature — le PM signe à la souris ou au doigt
// ────────────────────────────────────────────────────────────────────────────
// Plus simple qu'un scan à téléverser : on signe là où on est, et le résultat
// part directement en PNG.
//
// ⚠️ Le canvas est dessiné à la résolution de l'écran (devicePixelRatio) puis
// exporté à cette taille. Sans cela, une signature tracée sur un écran Retina
// serait deux fois trop petite dans le PDF, et floue.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { T } from "../marketing/tokens";

interface Props {
  /** Signature déjà enregistrée, affichée tant que le PM n'en trace pas une autre. */
  existingDataUrl?: string | null;
  /** Appelé à chaque trait terminé, avec le PNG en base64 (préfixe compris). */
  onChange: (dataUrl: string | null) => void;
}

const HEIGHT = 180;

export default function SignaturePad({ existingDataUrl, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [showExisting, setShowExisting] = useState(!!existingDataUrl);

  /** Met le canvas à la taille réelle de son conteneur, en tenant compte du zoom. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth ?? 600;
    canvas.width = width * ratio;
    canvas.height = HEIGHT * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${HEIGHT}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#16130E";
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  /** Coordonnées dans le canvas, souris ou doigt confondus. */
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Le premier trait efface la signature précédente : on ne dessine pas
    // par-dessus, on la remplace.
    if (showExisting) {
      setShowExisting(false);
      resize();
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // Capture le pointeur : le trait suit même si le doigt sort du cadre.
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasStroke.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke.current) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setShowExisting(false);
    // `null` efface la signature enregistrée — distinct de « ne rien envoyer ».
    onChange(null);
  };

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          border: `1.5px dashed ${T.line}`,
          borderRadius: "10px",
          bgcolor: T.card,
          overflow: "hidden",
        }}
      >
        {showExisting && existingDataUrl && (
          <Box
            component="img"
            src={existingDataUrl}
            alt="Signature enregistrée"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: HEIGHT,
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          style={{
            display: "block",
            // `touch-action: none` empêche le défilement de la page pendant
            // qu'on signe au doigt — sans lui, le geste fait défiler l'écran
            // au lieu de tracer.
            touchAction: "none",
            cursor: "crosshair",
          }}
        />
        {!showExisting && !hasStroke.current && (
          <Typography
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: T.mut,
              pointerEvents: "none",
            }}
          >
            Signez ici — à la souris ou au doigt
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={1.5} alignItems="center" mt={1}>
        <Button
          size="small"
          onClick={clear}
          sx={{ textTransform: "none", color: T.mut }}
        >
          Effacer
        </Button>
        <Typography sx={{ fontSize: 12, color: T.mut }}>
          Cette signature sera apposée sur vos devis et contrats.
        </Typography>
      </Stack>
    </Box>
  );
}
