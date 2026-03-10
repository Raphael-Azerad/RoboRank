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

  const getColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-primary";
    if (s >= 40) return "text-warning";
    return "text-destructive";
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClasses[size]}`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="40" fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className={`stat-number ${getColor(score)}`}>{score}</span>
    </div>
  );
}
