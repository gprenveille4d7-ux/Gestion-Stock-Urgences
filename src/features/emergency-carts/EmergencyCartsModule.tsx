import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { emergencyCarts } from "./emergencyCartData";
import type {
  CartBox,
  EmergencyCartDrawer,
  EmergencyCartItem,
} from "./types";
import "./emergency-carts.css";

type View = "box-choice" | "cart-front" | "drawer";

type EmergencyCartsModuleProps = {
  initialBox?: CartBox;
  onExit?: () => void;
};

export default function EmergencyCartsModule({
  initialBox,
  onExit,
}: EmergencyCartsModuleProps) {
  const [view, setView] = useState<View>(initialBox ? "cart-front" : "box-choice");
  const [box, setBox] = useState<CartBox>(initialBox ?? 3);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cart = emergencyCarts[box];
  const drawer = useMemo(
    () => cart.drawers.find((entry) => entry.id === drawerId) ?? null,
    [cart.drawers, drawerId],
  );
  const selectedItem =
    drawer?.items.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedItemId) {
        setSelectedItemId(null);
      } else if (view === "drawer") {
        setView("cart-front");
        setDrawerId(null);
      } else if (view === "cart-front") {
        setView("box-choice");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItemId, view]);

  const chooseBox = (nextBox: CartBox) => {
    setBox(nextBox);
    setDrawerId(null);
    setSelectedItemId(null);
    setNotice(null);
    setView("cart-front");
  };

  const openDrawer = (nextDrawer: EmergencyCartDrawer) => {
    if (!nextDrawer.available || !nextDrawer.topAsset) {
      setNotice(
        `${nextDrawer.label} : ajoute d’abord sa photo vue de dessus et son inventaire.`,
      );
      return;
    }

    setNotice(null);
    setDrawerId(nextDrawer.id);
    setSelectedItemId(null);
    setView("drawer");
  };

  const goBack = () => {
    setNotice(null);
    setSelectedItemId(null);

    if (view === "drawer") {
      setDrawerId(null);
      setView("cart-front");
      return;
    }

    if (view === "cart-front") {
      if (initialBox && onExit) {
        onExit();
      } else {
        setView("box-choice");
      }
      return;
    }

    onExit?.();
  };

  return (
    <main className="ecm-shell">
      <header className="ecm-header">
        {(view !== "box-choice" || onExit) && (
          <button className="ecm-back" type="button" onClick={goBack}>
            <span aria-hidden="true">←</span>
            Retour
          </button>
        )}

        <div>
          <p className="ecm-eyebrow">Gestion stock urgences</p>
          <h1>
            {view === "box-choice"
              ? "Chariots adultes"
              : view === "drawer" && drawer
                ? drawer.label
                : cart.label}
          </h1>
          {view === "drawer" && drawer && (
            <p className="ecm-subtitle">
              Box {box} · {drawer.items.length} matériels référencés
            </p>
          )}
        </div>
      </header>

      {view === "box-choice" && <BoxChoice onChoose={chooseBox} />}

      {view === "cart-front" && (
        <CartFront
          cart={cart}
          notice={notice}
          onOpenDrawer={openDrawer}
        />
      )}

      {view === "drawer" && drawer?.topAsset && (
        <DrawerView
          drawer={drawer}
          selectedItem={selectedItem}
          onSelect={(item) =>
            setSelectedItemId((current) => (current === item.id ? null : item.id))
          }
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </main>
  );
}

function BoxChoice({ onChoose }: { onChoose: (box: CartBox) => void }) {
  return (
    <section className="ecm-box-grid" aria-label="Choisir le box">
      {([3, 4] as const).map((box) => (
        <button
          className="ecm-box-card"
          type="button"
          key={box}
          onClick={() => onChoose(box)}
        >
          <span className="ecm-box-number">{box}</span>
          <span>
            <strong>Box {box} adulte</strong>
            <small>Ouvrir le chariot d’urgences</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      ))}
    </section>
  );
}

function CartFront({
  cart,
  notice,
  onOpenDrawer,
}: {
  cart: (typeof emergencyCarts)[3];
  notice: string | null;
  onOpenDrawer: (drawer: EmergencyCartDrawer) => void;
}) {
  return (
    <section className="ecm-stage">
      <p className="ecm-instruction">
        Touchez une façade de tiroir pour afficher son contenu.
      </p>

      <div className="ecm-cart-canvas">
        <img src={cart.frontAsset} alt={cart.label} />

        {cart.drawers.map((drawer) => (
          <button
            key={drawer.id}
            type="button"
            className={`ecm-drawer-hitbox ${
              drawer.available ? "is-available" : "is-pending"
            }`}
            style={{
              left: `${drawer.hitArea.x}%`,
              top: `${drawer.hitArea.y}%`,
              width: `${drawer.hitArea.width}%`,
              height: `${drawer.hitArea.height}%`,
            }}
            aria-label={
              drawer.available
                ? `Ouvrir ${drawer.label}`
                : `${drawer.label}, contenu non encore documenté`
            }
            onClick={() => onOpenDrawer(drawer)}
          >
            <span>{drawer.label}</span>
          </button>
        ))}
      </div>

      <div className="ecm-drawer-list" aria-label="Accès direct aux tiroirs">
        {cart.drawers.map((drawer) => (
          <button
            key={drawer.id}
            type="button"
            className={drawer.available ? "is-available" : "is-pending"}
            onClick={() => onOpenDrawer(drawer)}
          >
            <span>
              <strong>{drawer.label}</strong>
              <small>
                {drawer.available
                  ? drawer.category
                  : "Photo et inventaire à ajouter"}
              </small>
            </span>
            <span aria-hidden="true">{drawer.available ? "›" : "…"}</span>
          </button>
        ))}
      </div>

      {notice && (
        <p className="ecm-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

function DrawerView({
  drawer,
  selectedItem,
  onSelect,
  onClose,
}: {
  drawer: EmergencyCartDrawer;
  selectedItem: EmergencyCartItem | null;
  onSelect: (item: EmergencyCartItem) => void;
  onClose: () => void;
}) {
  const positionedItems = drawer.items.filter(
    (item): item is EmergencyCartItem & {
      asset: string;
      position: NonNullable<EmergencyCartItem["position"]>;
    } => Boolean(item.asset && item.position),
  );
  const itemsAwaitingAssets = drawer.items.filter(
    (item) => !item.asset || !item.position,
  );

  return (
    <section className="ecm-stage">
      <p className="ecm-instruction">
        Touchez un matériel pour afficher sa fiche. Les repères sous le tiroir
        restent utilisables tant que les détourages définitifs ne sont pas ajoutés.
      </p>

      <div
        className={`ecm-drawer-canvas ${selectedItem ? "has-selection" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <img className="ecm-drawer-background" src={drawer.topAsset} alt="" />

        {positionedItems.map((item) => {
          const selected = selectedItem?.id === item.id;
          return (
            <button
              key={item.id}
              className={`ecm-visual-item ${selected ? "is-selected" : ""}`}
              type="button"
              aria-label={`Afficher ${item.name}${
                item.specification ? `, ${item.specification}` : ""
              }`}
              aria-pressed={selected}
              onClick={() => onSelect(item)}
              style={{
                left: `${item.position.x}%`,
                top: `${item.position.y}%`,
                width: `${item.position.width}%`,
                height: `${item.position.height}%`,
                zIndex: selected ? 100 : item.position.zIndex ?? 1,
                "--item-rotation": `${item.position.rotation ?? 0}deg`,
              } as CSSProperties}
            >
              <img src={item.asset} alt="" />
            </button>
          );
        })}
      </div>

      <div className="ecm-inventory">
        <div className="ecm-inventory-heading">
          <h2>Matériel du tiroir</h2>
          <span>{drawer.items.length}</span>
        </div>
        <div className="ecm-item-grid">
          {drawer.items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selectedItem?.id === item.id ? "is-selected" : ""}
              aria-pressed={selectedItem?.id === item.id}
              onClick={() => onSelect(item)}
            >
              <strong>{item.name}</strong>
              {item.specification && <small>{item.specification}</small>}
            </button>
          ))}
        </div>
        {itemsAwaitingAssets.length > 0 && (
          <p className="ecm-assets-note">
            {itemsAwaitingAssets.length} détourages restent à ajouter. Les fiches
            sont déjà fonctionnelles.
          </p>
        )}
      </div>

      {selectedItem && <ItemDetailSheet item={selectedItem} onClose={onClose} />}
    </section>
  );
}

function ItemDetailSheet({
  item,
  onClose,
}: {
  item: EmergencyCartItem;
  onClose: () => void;
}) {
  return (
    <aside className="ecm-detail" aria-live="polite">
      <div>
        <p>{item.category}</p>
        <h2>{item.name}</h2>
        {item.specification && <strong>{item.specification}</strong>}
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer la fiche">
        ×
      </button>

      <dl>
        <div>
          <dt>Emplacement</dt>
          <dd>{item.location}</dd>
        </div>
        {item.quantityTarget !== undefined && (
          <div>
            <dt>Quantité cible</dt>
            <dd>
              {item.quantityTarget} {item.unit ?? ""}
            </dd>
          </div>
        )}
        {item.expiryTracked !== undefined && (
          <div>
            <dt>Péremption suivie</dt>
            <dd>{item.expiryTracked ? "Oui" : "Non"}</dd>
          </div>
        )}
        {item.note && (
          <div>
            <dt>Remarque</dt>
            <dd>{item.note}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
