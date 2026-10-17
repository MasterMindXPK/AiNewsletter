import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function FeaturedStory() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-10 md:grid-cols-12 md:items-stretch md:gap-0">
        <div className="flex flex-col md:col-span-6 md:border-r md:border-rule md:pr-12 lg:pr-16">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy motion-safe:animate-fade-up motion-safe:[animation-delay:1000ms]">
            Science &amp; Technology
          </p>

          <h2 className="mt-5 text-balance font-serif text-[2.25rem] font-medium leading-[1.08] tracking-[-0.02em] text-ink transition-colors duration-500 hover:text-burgundy motion-safe:animate-fade-up motion-safe:[animation-delay:1150ms] sm:text-5xl lg:text-[3.25rem]">
            AI cracks the folding code behind a decades-old disease
          </h2>

          <p className="mt-6 max-w-xl text-pretty font-serif text-lg leading-relaxed text-ink/80 motion-safe:animate-fade-up motion-safe:[animation-delay:1300ms] md:text-xl">
            Researchers at the Halvorsen Institute say a new system can predict
            how misfolded proteins cascade into neurodegeneration, years before
            symptoms appear. Early trials across eleven hospitals point to a
            first generation of preventive treatments within the decade.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[13px] text-ink-muted motion-safe:animate-fade-up motion-safe:[animation-delay:1450ms]">
            <span className="font-medium text-ink">The Meridian Review</span>
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
            <span>7 min read</span>
          </div>

          <div className="mt-auto pt-8 motion-safe:animate-fade-up motion-safe:[animation-delay:1600ms] md:pt-10">
            <Link
              href="/story/folding-code"
              className="group relative inline-flex items-center gap-2 pb-1 font-sans text-[13px] font-medium text-ink transition-colors duration-300 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
            >
              Read story
              <ArrowRight
                className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1.5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-ink"
              />
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-burgundy transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
            </Link>
          </div>
        </div>

        <figure className="group/figure md:col-span-6 md:pl-12 lg:pl-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-rule motion-safe:animate-image-reveal motion-safe:[animation-delay:600ms] sm:aspect-[5/4] md:aspect-auto md:h-full md:min-h-[520px]">
            <div className="absolute inset-0 motion-safe:animate-ken-burns">
              <Image
                src="/images/featured-story.png"
                alt="A researcher studies protein structure visualizations on a large screen in a sunlit laboratory lined with server racks."
                fill
                priority
                sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover/figure:scale-[1.04]"
              />
            </div>
          </div>
          <figcaption className="mt-3 font-sans text-[11px] leading-snug text-ink-muted motion-safe:animate-fade-in motion-safe:[animation-delay:1700ms]">
            A researcher reviews protein-folding simulations at the Halvorsen
            Institute. <span className="uppercase tracking-wider">Photo: Elena Marsh</span>
          </figcaption>
        </figure>
      </div>
      <div className="mt-10 h-px origin-left bg-rule motion-safe:animate-draw-line motion-safe:[animation-delay:1800ms] md:mt-14" />
    </article>
  )
}
