type Stat = {
  value: string;
  label: string;
};

type Props = {
  headline?: string;
  stats: Stat[];
};

export function StatsBanner({ headline, stats }: Props) {
  return (
    <section className="bg-primary py-16">
      <div className="mx-auto max-w-7xl px-6 text-center">
        {headline && (
          <p className="mb-10 text-lg font-medium text-mist/70">{headline}</p>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-secondary md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-mist/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
