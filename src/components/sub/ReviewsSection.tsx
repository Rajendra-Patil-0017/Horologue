import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/firebaseClient';
import * as api from '../../services/api';
import StarRating from './StarRating';

interface ReviewsSectionProps {
  productId: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ productId }) => {
  const [reviewsData, setReviewsData] = useState<api.ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getProductReviews(productId);
      setReviewsData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      await api.submitReview(productId, rating, comment.trim() || undefined);
      setFormSuccess(true);
      setComment('');
      setRating(5);
      await fetchReviews();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoggedIn = !!auth.currentUser;
  const reviewsList = reviewsData?.reviews || [];
  const hasReviewed = isLoggedIn && reviewsList.some(r => r.user_name.toLowerCase().startsWith('you') || r.user_name.toLowerCase().includes('you'));

  return (
    <div style={{ marginTop: '5rem', borderTop: '1px solid rgba(229, 228, 226, 0.1)', paddingTop: '4rem', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem' }}>
        
        {/* Left column: Summary and Review Form */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--color-white)', margin: '0 0 1.5rem 0', textTransform: 'uppercase' }}>
            Client Reviews
          </h2>

          {error && (
            <p style={{ color: '#ffb4ab', fontFamily: 'var(--font-body)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{error}</p>
          )}

          {loading && !reviewsData ? (
            <p style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-technical)' }}>Loading reviews...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ fontSize: '3.5rem', fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  {reviewsData?.averageRating || 0}
                </span>
                <div>
                  <StarRating rating={reviewsData?.averageRating || 0} size="1.25rem" />
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-slate)', display: 'block', marginTop: '0.25rem' }}>
                    Based on {reviewsData?.totalCount || 0} reviews
                  </span>
                </div>
              </div>

              {/* Review Input Form */}
              {isLoggedIn ? (
                hasReviewed ? (
                  <p style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Thank you. You have submitted a review for this timepiece.
                  </p>
                ) : (
                  <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', padding: '2rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-white)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Share Your Experience
                    </h3>

                    <div>
                      <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Rating
                      </label>
                      <StarRating rating={rating} interactive onChange={setRating} size="1.5rem" />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Comment
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write your review here..."
                        rows={4}
                        disabled={submitting}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--color-border)',
                          padding: '1rem',
                          color: 'var(--color-white)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          resize: 'vertical',
                          transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                      />
                    </div>

                    {formError && (
                      <div style={{ color: '#ffb4ab', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                        Review submitted successfully.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        background: 'var(--color-gold)',
                        color: 'var(--color-obsidian)',
                        border: 'none',
                        padding: '1rem',
                        fontFamily: 'var(--font-technical)',
                        fontSize: '0.8rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'opacity 0.3s ease'
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-silver)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                    Only registered collectors can submit reviews.
                  </p>
                  <button
                    onClick={() => (window.location.hash = '#/login')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--color-gold)',
                      color: 'var(--color-gold)',
                      padding: '0.75rem 1.5rem',
                      fontFamily: 'var(--font-technical)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Log In to Review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Reviews List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', maxHeight: '600px', paddingRight: '1rem' }}>
          {loading && !reviewsData ? (
            <p style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-technical)' }}>Loading reviews...</p>
          ) : reviewsList.length === 0 ? (
            <p style={{ color: 'var(--color-slate)', fontFamily: 'var(--font-body)', fontStyle: 'italic', marginTop: '4rem' }}>
              No reviews have been written for this timepiece yet.
            </p>
          ) : (
            reviewsList.map((review) => (
              <div 
                key={review.id} 
                style={{ 
                  borderBottom: '1px solid rgba(229, 228, 226, 0.05)', 
                  paddingBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.875rem', color: 'var(--color-white)', fontWeight: 500 }}>
                      {review.user_name}
                    </span>
                    {review.verified_purchase && (
                      <span 
                        style={{ 
                          fontSize: '0.6rem', 
                          fontFamily: 'var(--font-technical)', 
                          color: 'var(--color-gold)', 
                          border: '1px solid var(--color-gold)', 
                          padding: '0.1rem 0.4rem', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em' 
                        }}
                      >
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                    {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <StarRating rating={review.rating} size="0.875rem" />

                {review.comment && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--color-silver)', margin: '0.25rem 0 0 0', lineHeight: 1.6 }}>
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default ReviewsSection;
