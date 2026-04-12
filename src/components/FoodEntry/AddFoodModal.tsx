import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { FoodEntry, FoodCategory, Texture, TimeOfDay, AmountEaten, EnjoymentLevel, ReactionDelay } from '../../types';
import { ALLERGENS, FOOD_CATEGORIES, TEXTURES, TIMES_OF_DAY, AMOUNTS, ENJOYMENT_LEVELS, SYMPTOMS } from '../../utils/constants';

interface AddFoodModalProps {
  date: string;
  onClose: () => void;
  onSave: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  isFirstIntroduction: (foodName: string, date: string) => boolean;
}

const SUGGESTED_FOODS = [
  'Sweet potato', 'Avocado', 'Banana', 'Pear', 'Apple', 'Butternut squash',
  'Peas', 'Carrots', 'Broccoli', 'Oatmeal', 'Rice cereal', 'Greek yogurt',
  'Lentils', 'Chicken', 'Salmon', 'Egg yolk', 'Mango', 'Blueberries',
  'Peach', 'Prunes', 'Green beans', 'Zucchini', 'Spinach', 'Tofu',
];

type Step = 'food' | 'details' | 'reaction' | 'notes';

export default function AddFoodModal({ date, onClose, onSave, isFirstIntroduction }: AddFoodModalProps) {
  const [step, setStep] = useState<Step>('food');
  const [foodName, setFoodName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [category, setCategory] = useState<FoodCategory>('vegetables');
  const [texture, setTexture] = useState<Texture>('puree');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [amountEaten, setAmountEaten] = useState<AmountEaten>('a_little');
  const [enjoyment, setEnjoyment] = useState<EnjoymentLevel>('neutral');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [hadReaction, setHadReaction] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [reactionDelay, setReactionDelay] = useState<ReactionDelay>('immediate');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (foodName.length >= 2) {
      const q = foodName.toLowerCase();
      setSuggestions(SUGGESTED_FOODS.filter(f => f.toLowerCase().includes(q)).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [foodName]);

  const toggleAllergen = (id: string) => {
    setSelectedAllergens(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const isFirstTry = foodName.trim().length > 0 && isFirstIntroduction(foodName.trim(), date);

  const handleSave = () => {
    if (!foodName.trim()) return;
    onSave({
      date,
      foodName: foodName.trim(),
      foodCategory: category,
      texture,
      timeOfDay,
      amountEaten,
      enjoyment,
      allergens: selectedAllergens,
      isFirstIntroduction: isFirstTry,
      hadReaction,
      reactionDelay: hadReaction ? reactionDelay : null,
      symptoms: hadReaction ? selectedSymptoms : [],
      notes: notes.trim(),
    });
  };

  const STEPS: Step[] = ['food', 'details', 'reaction', 'notes'];
  const stepIdx = STEPS.indexOf(step);
  const STEP_LABELS: Record<Step, string> = {
    food: 'What food?',
    details: 'Details',
    reaction: 'Reactions',
    notes: 'Notes & Review',
  };
  const canGoNext = step === 'food' ? foodName.trim().length > 0 : true;

  const goNext = () => {
    const next = STEPS[stepIdx + 1];
    if (next) setStep(next);
    else handleSave();
  };

  const goPrev = () => {
    const prev = STEPS[stepIdx - 1];
    if (prev) setStep(prev);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div>
            <h2 className="font-bold text-gray-800">Log Food</h2>
            <p className="text-xs text-gray-400">{format(new Date(date + 'T00:00:00'), 'MMMM d, yyyy')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-4 pt-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIdx ? 'bg-sage-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="px-4 pt-1 text-xs text-gray-400 font-medium">
          Step {stepIdx + 1} of {STEPS.length} — {STEP_LABELS[step]}
        </p>

        <div className="p-4 space-y-5">
          {/* STEP 1: Food name + category */}
          {step === 'food' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">What food did baby try? *</label>
                <input
                  type="text"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  placeholder="e.g. Sweet potato"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
                  autoFocus
                />
                {suggestions.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setFoodName(s); setSuggestions([]); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sage-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {isFirstTry && foodName.trim() && (
                  <p className="text-xs text-sage-600 mt-1.5 font-medium">⭐ This is baby's first time trying this food!</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Food category</label>
                <div className="grid grid-cols-3 gap-2">
                  {FOOD_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-sm ${
                        category === cat.id ? 'border-sage-400 bg-sage-50' : 'border-gray-200 hover:border-sage-200'
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contains allergens?</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGENS.map(allergen => (
                    <button
                      key={allergen.id}
                      onClick={() => toggleAllergen(allergen.id)}
                      className={`chip px-2 py-1 border transition-all ${
                        selectedAllergens.includes(allergen.id)
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                      }`}
                    >
                      {allergen.emoji} {allergen.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Details */}
          {step === 'details' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Texture / Preparation</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEXTURES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTexture(t.id)}
                      className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        texture === t.id ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600 hover:border-sage-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time of day</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIMES_OF_DAY.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTimeOfDay(t.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        timeOfDay === t.id ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600 hover:border-sage-200'
                      }`}
                    >
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">How much did baby eat?</label>
                <div className="flex flex-col gap-1.5">
                  {AMOUNTS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAmountEaten(a.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                        amountEaten === a.id ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600 hover:border-sage-200'
                      }`}
                    >
                      <span className="text-lg w-7 text-center">{a.emoji}</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">How much did baby enjoy it?</label>
                <div className="flex flex-col gap-1.5">
                  {ENJOYMENT_LEVELS.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setEnjoyment(e.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                        enjoyment === e.id ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600 hover:border-sage-200'
                      }`}
                    >
                      <span className="text-xl w-7 text-center">{e.emoji}</span> {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Reactions */}
          {step === 'reaction' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Did baby have any reaction?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHadReaction(false)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      !hadReaction ? 'border-sage-400 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    ✅ No reaction
                  </button>
                  <button
                    onClick={() => setHadReaction(true)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      hadReaction ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    ⚠️ Had reaction
                  </button>
                </div>
              </div>

              {hadReaction && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Symptoms observed</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SYMPTOMS.map(symptom => (
                        <button
                          key={symptom.id}
                          onClick={() => toggleSymptom(symptom.id)}
                          className={`chip px-2 py-1 border transition-all ${
                            selectedSymptoms.includes(symptom.id)
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
                          }`}
                        >
                          {symptom.emoji} {symptom.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">When did it appear?</label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'immediate' as ReactionDelay, label: 'Immediately (within minutes)' },
                        { id: 'within_hours' as ReactionDelay, label: 'Within a few hours' },
                        { id: 'next_day' as ReactionDelay, label: 'Next day' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setReactionDelay(opt.id)}
                          className={`p-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                            reactionDelay === opt.id ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <strong>Reminder:</strong> If your baby is having a severe reaction (difficulty breathing, severe swelling, loss of consciousness), call emergency services immediately.
                  </div>
                </>
              )}
            </>
          )}

          {/* STEP 4: Notes */}
          {step === 'notes' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any observations? e.g. Made funny faces but kept eating! Preferred it cold."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-sage-50 rounded-xl p-3 space-y-1 text-sm">
                <p className="font-semibold text-sage-700 mb-2">Summary</p>
                <p><span className="text-gray-500">Food:</span> <span className="font-medium capitalize">{foodName}</span> {isFirstTry && '⭐'}</p>
                <p><span className="text-gray-500">Enjoyment:</span> {ENJOYMENT_LEVELS.find(e => e.id === enjoyment)?.emoji} {ENJOYMENT_LEVELS.find(e => e.id === enjoyment)?.label}</p>
                <p><span className="text-gray-500">Amount:</span> {AMOUNTS.find(a => a.id === amountEaten)?.label}</p>
                {selectedAllergens.length > 0 && (
                  <p><span className="text-gray-500">Allergens:</span> {selectedAllergens.map(id => ALLERGENS.find(a => a.id === id)?.label).join(', ')}</p>
                )}
                {hadReaction && <p className="text-amber-600">⚠️ Reaction logged</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          {stepIdx > 0 && (
            <button onClick={goPrev} className="btn-secondary flex-1">
              Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stepIdx === STEPS.length - 1 ? 'Save Entry ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
