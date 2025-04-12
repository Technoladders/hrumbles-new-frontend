import { Star } from "lucide-react";

export const StarRating = ({ rating, onRate }) => (
    <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((value) => (
            <Star
                key={value}
                className={`h-5 w-5 cursor-pointer ${
                    value <= rating ? "text-yellow-400" : "text-gray-300"
                }`}
                onClick={() => onRate(value)}
                fill={value <= rating ? "currentColor" : "none"}
            />
        ))}
    </div>
);
