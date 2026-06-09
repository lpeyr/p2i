"use client";

import { Separator } from "@heroui/react";

const LAST_UPDATED = "9 juin 2026";

const sensors = [
    {
        label: "FlexiForce avant-pied (×1)",
        description: "Capteur de pression piézoélectrique, zone métatarsienne",
        color: "bg-blue-500",
    },
    {
        label: "FlexiForce médio-pied (×1)",
        description: "Capteur de pression piézoélectrique, zone voûte plantaire",
        color: "bg-blue-400",
    },
    {
        label: "FlexiForce arrière-pied (×1)",
        description: "Capteur de pression piézoélectrique, zone talonnière",
        color: "bg-blue-300",
    },
    {
        label: "Centrale inertielle (IMU)",
        description: "Accéléromètre 3 axes, gyroscope 3 axes — détection du mouvement",
        color: "bg-violet-500",
    },
    {
        label: "GPS",
        description: "Localisation géographique et vitesse de déplacement",
        color: "bg-emerald-500",
    },
];

function Section({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="py-8">
            <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-900">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
        </section>
    );
}

export default function MentionsLegales() {
    return (
        <main className="min-h-screen bg-white px-4 py-12 pb-24">
            <div className="mx-auto max-w-2xl">
                {/* En-tête */}
                <header className="mb-10">
                    <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
                        Mentions légales
                    </h1>
                    <p className="text-sm text-slate-400">Dernière mise à jour : {LAST_UPDATED}</p>
                </header>

                <Separator className="bg-slate-100" />

                {/* 1. Éditeur */}
                <Section id="editeur" title="1. Éditeur">
                    <p>
                        Cette application est développée dans le cadre du projet P2I2 de l&apos;INSA
                        Lyon, département FIMI. Il s&apos;agit d&apos;un projet pédagogique de
                        recherche et développement portant sur une semelle connectée destinée à
                        l&apos;analyse podologique.
                    </p>
                    <p>
                        Établissement : Institut National des Sciences Appliquées de Lyon (INSA
                        Lyon), 20 avenue Albert Einstein, 69621 Villeurbanne Cedex.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 2. Données collectées */}
                <Section id="donnees" title="2. Données collectées">
                    <p>
                        L&apos;application collecte les mesures issues des capteurs embarqués dans
                        chaque semelle. Ces données sont transmises, puis stockées dans une base de
                        données sécurisée afin de générer des analyses et de mettre à disposition
                        des statistiques personnalisées à l&apos;utilisateur.
                    </p>
                    <p>Les capteurs présents dans chaque semelle sont les suivants :</p>

                    {/* Capteurs */}
                    <ul className="mt-4 space-y-3">
                        {sensors.map((sensor) => (
                            <li key={sensor.label} className="flex items-start gap-3">
                                <span
                                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${sensor.color}`}
                                />
                                <span>
                                    <span className="font-medium text-slate-700">
                                        {sensor.label}
                                    </span>{" "}
                                    — {sensor.description}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-4">
                        Les données brutes de ces capteurs (valeurs de pression, données
                        inertielles, coordonnées GPS et horodatages) sont les seules informations
                        conservées en base de données.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 3. Traitement et analyses */}
                <Section id="traitement" title="3. Traitement et résultats d'analyse">
                    <p>
                        Les données stockées sont traitées algorithmiquement pour produire des
                        statistiques de marche, de posture et de répartition des pressions
                        plantaires. Ces résultats sont affichés à l&apos;utilisateur au sein de
                        l&apos;application.
                    </p>
                    <p>
                        <span className="font-medium text-slate-700">
                            Les résultats d&apos;analyse ne sont pas conservés en base de données.
                        </span>{" "}
                        Ce choix est délibéré : il permet de ne pas stocker ni traiter durablement
                        des informations à caractère médical sensible, conformément au principe de
                        minimisation des données prévu par le RGPD. Seules les mesures brutes des
                        capteurs, qui ne constituent pas en elles-mêmes des données médicales
                        diagnostiques, sont persistées.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 4. Accès aux données */}
                <Section id="acces" title="4. Accès aux données">
                    <p>
                        L&apos;accès aux données collectées est strictement limité aux personnes
                        suivantes :
                    </p>
                    <ul className="mt-2 list-none space-y-2">
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                            <span>
                                <span className="font-medium text-slate-700">
                                    L&apos;utilisateur lui-même
                                </span>{" "}
                                — accès complet à ses propres mesures et statistiques via
                                l&apos;interface de l&apos;application.
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                            <span>
                                <span className="font-medium text-slate-700">
                                    Le podologue référent
                                </span>{" "}
                                — accès aux données du patient dans le cadre d&apos;un suivi
                                podologique, après accord explicite de l&apos;utilisateur.
                            </span>
                        </li>
                    </ul>
                    <p className="mt-3">
                        Aucun tiers — qu&apos;il s&apos;agisse d&apos;un organisme tiers, d&apos;un
                        partenaire commercial ou d&apos;un prestataire — ne dispose d&apos;un accès
                        aux données individuelles des utilisateurs.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 5. RGPD */}
                <Section id="rgpd" title="5. Vos droits (RGPD)">
                    <p>
                        Conformément au Règlement Général sur la Protection des Données (RGPD —
                        Règlement UE 2016/679), vous disposez des droits suivants sur vos données :
                    </p>
                    <ul className="mt-2 list-none space-y-1">
                        {[
                            "Droit d'accès à vos données",
                            "Droit de rectification",
                            "Droit à l'effacement (« droit à l'oubli »)",
                            "Droit à la limitation du traitement",
                            "Droit à la portabilité",
                            "Droit d'opposition",
                        ].map((droit) => (
                            <li key={droit} className="flex items-start gap-3">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                                <span>{droit}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3">
                        Pour exercer ces droits, contactez l&apos;équipe projet via les canaux mis à
                        disposition dans l&apos;application.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 6. Sécurité */}
                <Section id="securite" title="6. Sécurité">
                    <p>
                        Les données sont transmises via des connexions chiffrées (HTTPS/TLS) et
                        stockées dans une base de données dont l&apos;accès est contrôlé par
                        authentification. Des mesures techniques et organisationnelles sont mises en
                        œuvre pour prévenir tout accès non autorisé, toute perte ou toute
                        divulgation des données.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* 7. Cookies */}
                <Section id="cookies" title="7. Cookies et traceurs">
                    <p>
                        L&apos;application n&apos;utilise pas de cookies à des fins publicitaires ou
                        de traçage commercial. Des cookies techniques strictement nécessaires au
                        fonctionnement de l&apos;authentification et de la session peuvent être
                        utilisés.
                    </p>
                </Section>

                <Separator className="bg-slate-100" />

                {/* Pied de page */}
                <footer className="pt-8 pb-4 text-xs text-slate-400">
                    <p>
                        Ces mentions légales sont susceptibles d&apos;évoluer. La date de dernière
                        mise à jour figure en en-tête de cette page.
                    </p>
                </footer>
            </div>
        </main>
    );
}
