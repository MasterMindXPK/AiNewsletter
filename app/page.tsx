import { FeaturedStory } from '@/components/featured-story'
import { Masthead } from '@/components/masthead'
import { SiteNav } from '@/components/site-nav'

export default function Page() {
  return (
    <>
      <SiteNav />
      <main>
        <Masthead />
        <FeaturedStory />
      </main>
    </>
  )
}
