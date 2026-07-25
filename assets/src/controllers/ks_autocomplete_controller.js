import { Controller } from '@hotwired/stimulus';

/*
 * Wires a Framework7 dropdown autocomplete (openIn: 'dropdown') to a JSON
 * endpoint, e.g. Survos\FwBundle\Components\Ks\Autocomplete's rendered
 * markup. Requires window.app (the Framework7 instance) to already exist --
 * see fw-bundle's f7 Stimulus controller / README.
 */
export default class extends Controller {
    static values = {
        sourceUrl: String,
        inputId: String,
    };

    connect() {
        this.autocomplete = window.app.autocomplete.create({
            inputEl: `#${this.inputIdValue}`,
            openIn: 'dropdown',
            preloader: true,
            valueProperty: 'id',
            textProperty: 'name',
            limit: 20,
            source: (query, render) => {
                if (query.length === 0) {
                    render([]);
                    return;
                }
                fetch(`${this.sourceUrlValue}?query=${encodeURIComponent(query)}`)
                    .then((res) => res.json())
                    .then((data) => render(data));
            },
        });
    }

    disconnect() {
        this.autocomplete?.destroy();
    }
}
