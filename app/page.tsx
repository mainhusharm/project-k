import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Clock, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">PropFirm</h1>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="mb-6 text-5xl font-bold text-slate-900">
          Get Funded. Trade Professional Capital.
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-600 leading-relaxed">
          Pass our evaluation challenge and trade with up to $100,000 in capital. Keep up to 80% of profits.
        </p>
        <Link href="/register">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Your Challenge
          </Button>
        </Link>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h3 className="mb-12 text-center text-3xl font-bold text-slate-900">
          Choose Your Challenge
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ChallengeCard
            name="10K Challenge"
            price="$99"
            accountSize="$10,000"
            profitTarget="$1,000"
          />
          <ChallengeCard
            name="25K Challenge"
            price="$199"
            accountSize="$25,000"
            profitTarget="$2,500"
            popular
          />
          <ChallengeCard
            name="50K Challenge"
            price="$299"
            accountSize="$50,000"
            profitTarget="$4,000"
          />
          <ChallengeCard
            name="100K Challenge"
            price="$499"
            accountSize="$100,000"
            profitTarget="$8,000"
          />
        </div>
      </section>

      <section className="bg-white py-20 border-y">
        <div className="container mx-auto px-4">
          <h3 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Why Choose Us?
          </h3>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-10 w-10 text-blue-600" />}
              title="Fast Evaluation"
              description="Get evaluated in as little as 5 trading days"
            />
            <FeatureCard
              icon={<DollarSign className="h-10 w-10 text-blue-600" />}
              title="Generous Profit Split"
              description="Keep up to 80% of your trading profits"
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10 text-blue-600" />}
              title="No Time Limit"
              description="Trade at your own pace with no expiration"
            />
          </div>
        </div>
      </section>

      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <p>&copy; 2024 PropFirm. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function ChallengeCard({
  name,
  price,
  accountSize,
  profitTarget,
  popular,
}: {
  name: string
  price: string
  accountSize: string
  profitTarget: string
  popular?: boolean
}) {
  return (
    <Card className={popular ? 'border-blue-600 ring-2 ring-blue-600 shadow-lg' : 'shadow-md'}>
      <CardHeader>
        {popular && (
          <div className="mb-2 text-sm font-semibold text-blue-600">
            MOST POPULAR
          </div>
        )}
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-3xl font-bold text-slate-900">
          {price}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Account Size:</span>
          <span className="font-semibold text-slate-900">{accountSize}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Profit Target:</span>
          <span className="font-semibold text-slate-900">{profitTarget}</span>
        </div>
        <Link href="/register">
          <Button className="mt-4 w-full">Get Started</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center space-y-3">
      <div className="flex justify-center">{icon}</div>
      <h4 className="text-xl font-semibold text-slate-900">{title}</h4>
      <p className="text-slate-600">{description}</p>
    </div>
  )
}
