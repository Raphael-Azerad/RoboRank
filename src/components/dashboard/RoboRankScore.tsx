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

  // Smooth HSL interpolation: red(0) → yellow(45) → green(145)
  const getInterpolatedStroke = (s: number) => {
    const clamped = Math.max(0, Math.min(100, s));
    const t = clamped / 100;
    // Use cubic easing through yellow zone for smoother mid-range
    let hue: number;
    if (t < 0.5) {
      // 0→50: red(0) to yellow(45), ease-out
      const t2 = t * 2; // normalize to 0-1
      hue = t2 * 45;
    } else {
      // 50→100: yellow(45) to green(145), ease-in
      const t2 = (t - 0.5) * 2; // normalize to 0-1
      hue = 45 + t2 * 100;
    }
    const sat = 72;
    const light = 48 - Math.abs(t - 0.5) * 10;
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
