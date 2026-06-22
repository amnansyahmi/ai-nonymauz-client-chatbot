'use client';

import { useEffect, useRef, useState } from 'react';

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  avatar: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah & Amir',
    role: 'Berkahwin Ogos 2024',
    quote: 'MajlisMate bantu kami rancang semua — dari vendor sampai senarai tetamu. Memang senang!',
    avatar: '👩‍❤️‍👨'
  },
  {
    name: 'Nurul & Haziq',
    role: 'Berkahwin Disember 2024',
    quote: 'Voice mode dalam BM memang game changer. Boleh plan sambil masak!',
    avatar: '💑'
  },
  {
    name: 'Wei & Mei',
    role: 'Berkahwin Mac 2025',
    quote: 'Budget tracker selamatkan kami dari terlebih belanja. Recommended untuk semua!',
    avatar: '👫'
  }
];

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDotClick = (index: number) => {
    setActive(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
  };

  return (
    <div className="testimonial-carousel" role="region" aria-label="Testimonials">
      <div className="testimonial-carousel__track">
        {TESTIMONIALS.map((testimonial, index) => (
          <div
            key={index}
            className={`testimonial-card ${index === active ? 'testimonial-card--active' : ''}`}
          >
            <div className="testimonial-card__avatar">{testimonial.avatar}</div>
            <blockquote className="testimonial-card__quote">
              "{testimonial.quote}"
            </blockquote>
            <div className="testimonial-card__author">
              <strong>{testimonial.name}</strong>
              <span>{testimonial.role}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="testimonial-carousel__dots">
        {TESTIMONIALS.map((_, index) => (
          <button
            key={index}
            className={`testimonial-carousel__dot ${index === active ? 'testimonial-carousel__dot--active' : ''}`}
            onClick={() => handleDotClick(index)}
            aria-label={`Testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
