"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

interface Banner {
  id: number;
  image_url: string;
  title: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface BannerManagerProps {
  showToast?: (message: string, type?: "success" | "error" | "loading", duration?: number) => number;
  dismissToast?: (id: number) => void;
}

export const BannerManager = ({ showToast, dismissToast }: BannerManagerProps) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    let toastId: number | undefined;
    
    try {
      if (showToast) {
        toastId = showToast("Loading banners...", "loading");
      }

      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanners(data || []);
      
      if (showToast && toastId) {
        dismissToast?.(toastId);
      }
    } catch (error: any) {
      console.error("Error fetching banners:", error);
      if (showToast) {
        showToast(error.message || "Failed to load banners", "error", 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadBanner = async () => {
    if (!selectedFile) {
      if (showToast) {
        showToast("Please select an image file", "error", 3000);
      }
      return;
    }

    setUploading(true);
    let toastId: number | undefined;
    
    try {
      if (showToast) {
        toastId = showToast("Uploading banner...", "loading");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("banners")
        .getPublicUrl(filePath);

      await supabase
        .from("banners")
        .update({ is_active: false })
        .eq("is_active", true);

      const { error: dbError } = await supabase
        .from("banners")
        .insert({
          image_url: publicUrl,
          title: title || null,
          description: description || null,
          is_active: true,
          updated_by: user.id
        });

      if (dbError) throw dbError;

      setSelectedFile(null);
      setPreviewUrl(null);
      setTitle("");
      setDescription("");
      
      await fetchBanners();
      
      if (showToast && toastId) {
        dismissToast?.(toastId);
        showToast("Banner uploaded successfully!", "success", 3000);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      if (showToast) {
        if (toastId) dismissToast?.(toastId);
        showToast(error.message || "Failed to upload banner", "error", 3000);
      }
    } finally {
      setUploading(false);
    }
  };

  const setActiveBanner = async (bannerId: number) => {
    let toastId: number | undefined;
    
    try {
      if (showToast) {
        toastId = showToast("Updating banner...", "loading");
      }

      await supabase
        .from("banners")
        .update({ is_active: false })
        .neq("id", bannerId);

      const { error } = await supabase
        .from("banners")
        .update({ is_active: true })
        .eq("id", bannerId);

      if (error) throw error;
      
      await fetchBanners();
      
      if (showToast && toastId) {
        dismissToast?.(toastId);
        showToast("Banner activated successfully!", "success", 3000);
      }
    } catch (error: any) {
      console.error("Error activating banner:", error);
      if (showToast) {
        if (toastId) dismissToast?.(toastId);
        showToast(error.message || "Failed to activate banner", "error", 3000);
      }
    }
  };

  const deleteBanner = async (bannerId: number, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    let toastId: number | undefined;
    
    try {
      if (showToast) {
        toastId = showToast("Deleting banner...", "loading");
      }

      const fileName = imageUrl.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from("banners")
          .remove([fileName]);
      }

      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", bannerId);

      if (error) throw error;
      
      await fetchBanners();
      
      if (showToast && toastId) {
        dismissToast?.(toastId);
        showToast("Banner deleted successfully!", "success", 3000);
      }
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      if (showToast) {
        if (toastId) dismissToast?.(toastId);
        showToast(error.message || "Failed to delete banner", "error", 3000);
      }
    }
  };

  return (
    <div style={{ padding: '0' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>🎨 Banner Management</h2>

      {/* Upload Form */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #F0F0F0',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Upload New Banner</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ 
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              fontSize: '14px'
            }}
            disabled={uploading}
          />
          {previewUrl && (
            <div>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%',
                  maxHeight: '200px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #F0F0F0'
                }} 
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="Enter banner title"
            disabled={uploading}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
            placeholder="Enter banner description"
            disabled={uploading}
          />
        </div>

        <button
          onClick={uploadBanner}
          disabled={!selectedFile || uploading}
          style={{
            width: '100%',
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
            opacity: !selectedFile || uploading ? 0.6 : 1
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Banner'}
        </button>
      </div>

      {/* Banners List */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #F0F0F0',
        overflow: 'hidden'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, padding: '16px', borderBottom: '1px solid #F0F0F0' }}>
          Existing Banners
        </h3>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spin" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#999' }}>Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            No banners found. Upload your first banner!
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              style={{
                padding: '16px',
                borderBottom: '1px solid #F0F0F0',
                background: banner.is_active ? '#F0F9F0' : 'transparent'
              }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px'
              }}>
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '150px',
                    objectFit: 'cover',
                    borderRadius: '6px'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{banner.title || 'Untitled'}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {banner.description || 'No description'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Added: {new Date(banner.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!banner.is_active ? (
                    <button
                      onClick={() => setActiveBanner(banner.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        border: '1px solid #4CAF50',
                        background: '#fff',
                        color: '#4CAF50',
                        cursor: 'pointer'
                      }}
                    >
                      Set Active
                    </button>
                  ) : (
                    <span style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: '#4CAF50',
                      color: '#fff',
                      textAlign: 'center'
                    }}>
                      Active ✓
                    </span>
                  )}
                  <button
                    onClick={() => deleteBanner(banner.id, banner.image_url)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: '1px solid #FF5252',
                      background: '#fff',
                      color: '#FF5252',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .spin {
          width: 32px;
          height: 32px;
          border: 3px solid #F0F0F0;
          border-top-color: #111;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};