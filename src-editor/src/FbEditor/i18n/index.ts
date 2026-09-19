import { I18n } from '@iobroker/gui-components';

import en from './en.json';
import de from './de.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import nl from './nl.json';
import pl from './pl.json';
import pt from './pt.json';
import ru from './ru.json';
import uk from './uk.json';
import zhCn from './zh-cn.json';

/**
 * The texts of the diagram editor come with its chunk and not with the application: nobody who
 * never opens a diagram has to load them.
 */
const translations: Partial<Record<ioBroker.Languages, Record<string, string>>> = {
    en,
    de,
    es,
    fr,
    it,
    nl,
    pl,
    pt,
    ru,
    uk,
    'zh-cn': zhCn,
};

Object.entries(translations).forEach(([lang, words]) => I18n.extendTranslations(words, lang as ioBroker.Languages));
