import { motion } from "framer-motion";

interface RoboRankScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function RoboRankScore({ score, size = "md" }: RoboRankScoreProps) {
  const sizeClasses = {
    sm: "h-12 w-12 text-sm",
    md: "h-20 w-20 text-2xl",
    lg: "h-28 w-28 text-4xl",
  };

  // Gradient from red (0) → yellow (50) → green (100)
  const getColor = (s: number) => {
    if (s >= 75) return { stroke: "hsl(145, 70%, 45%)", text: "text-[hsl(145,70%,45%)]" };
    if (s >= 50) return { stroke: "hsl(80, 65%, 45%)", text: "text-[hsl(80,65%,45%)]" };
    if (s >= 25) return { stroke: "hsl(35, 90%, 55%)", text: "text-[hsl(35,90%,55%)]" };
    return { stroke: "hsl(0, 72%, 51%)", text: "text-destructive" };
  };

  // Smooth HSL interpolation: red(0) → green(145)
  const getInterpolatedStroke = (s: number) => {
    const clamped = Math.max(0, Math.min(100, s));
    // Hue: 0 (red) → 145 (green)
    const hue = (clamped / 100) * 145;
    // Saturation: keep vibrant
    const sat = 70 + (clamped / 100) * 5;
    // Lightness: slightly brighter in middle
    const light = 45 + Math.sin((clamped / 100) * Math.PI) * 10;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const strokeColor = getInterpolatedStroke(score);
  const { text } = getColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClasses[size]}`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="40" fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className={`stat-number ${text}`}>{score}</span>
    </div>
  );
}
