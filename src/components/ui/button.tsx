import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/*
 * The gold offset shadow is the brand's signature. It is reserved for the primary action of a
 * screen so it keeps meaning something; every other button stays quiet.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color,color] duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-2 border-ink bg-ink text-paper hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset focus-visible:shadow-offset active:translate-0 active:shadow-none',
        secondary: 'border border-line bg-paper text-ink hover:border-ink-soft hover:bg-cream-deep',
        ghost: 'text-ink-soft hover:bg-cream-deep hover:text-ink',
        link: 'rounded-sm px-0 text-gold-ink underline-offset-4 hover:underline',
      },
      size: {
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-[0.9375rem]',
        icon: 'size-10',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
}

export { buttonVariants };
