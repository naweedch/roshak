import { connection } from "next/server";
import { Suspense } from "react";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogSkeleton } from "@/components/store/catalog-view";
import { accentClasses } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { getCollection, getCollectionRedirect } from "@/server/queries/public";
import { CatalogResults, catalogMetadata, type SearchParams } from "../../shop/_catalog";

type Params = Promise<{ slug: string }>;

async function resolve(params: Params) {
  // داده‌ها فقط هنگام درخواست خوانده می‌شوند (build به پایگاه داده نیاز ندارد)
  await connection();
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const collection = await getCollection(slug);
  if (collection) return collection;
  const target = await getCollectionRedirect(slug);
  if (target) permanentRedirect(`/collections/${target}`);
  notFound();
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const collection = await resolve(params);
  return catalogMetadata(searchParams, {
    title: collection.seoTitle ?? collection.name,
    description: collection.seoDescription ?? collection.description ?? `مجموعهٔ ${collection.name} روشاک`,
    basePath: `/collections/${collection.slug}`,
    defaults: { collection: collection.slug },
    image: collection.coverImage?.url,
  });
}

export default function CollectionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <CollectionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  // داده‌ها فقط هنگام درخواست خوانده می‌شوند (build به پایگاه داده نیاز ندارد)
  await connection();
  const collection = await resolve(params);
  const accent = accentClasses(collection.accentColor);
  return (
    <>
      <section className={cn("on-dark relative isolate overflow-hidden text-ivory", accent.bg)} aria-labelledby="collection-title">
        {collection.coverImage ? (
          <Image src={collection.coverImage.url} alt={collection.coverImage.alt} fill priority sizes="100vw" className="-z-10 object-cover opacity-70" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-charcoal/20 via-charcoal/40 to-charcoal/80" />
        <div className="mx-auto flex min-h-[46svh] max-w-[1440px] flex-col justify-end px-4 pb-14 pt-24 sm:px-8">
          <Breadcrumbs tone="dark" items={[{ name: "مجموعه‌ها", path: "/collections" }, { name: collection.name, path: `/collections/${collection.slug}` }]} />
          {collection.subtitle ? <p className={cn("mt-6 text-sm", accent.textOnDark)}>{collection.subtitle}</p> : null}
          <h1 id="collection-title" className="mt-2 font-display text-5xl text-ivory sm:text-7xl">
            {collection.name}
          </h1>
          {collection.description ? <p className="mt-4 max-w-2xl text-lg leading-9 text-ivory/80">{collection.description}</p> : null}
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-12 sm:px-8">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogResults searchParams={searchParams} basePath={`/collections/${collection.slug}`} defaults={{ collection: collection.slug }} />
        </Suspense>
      </div>
    </>
  );
}

function CollectionSkeleton() {
  return (
    <div aria-busy>
      <div className="min-h-[46svh] bg-burgundy-deep" />
      <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-8">
        <CatalogSkeleton />
      </div>
    </div>
  );
}
