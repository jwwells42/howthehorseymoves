"use client";

interface StarRatingProps {
  stars: number;
  size?: "sm" | "md" | "lg";
}

export default function StarRating({ stars, size = "md" }: StarRatingProps) {
  const sizeClass = { sm: "text-sm", md: "text-2xl", lg: "text-4xl" }[size];
  return (
    <span className={`${sizeClass} inline-flex`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= stars ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}>
          &#9733;
        </span>
      ))}
    </span>
  );
}
